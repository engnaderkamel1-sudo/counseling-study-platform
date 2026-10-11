# Batch script to generate audio for Chapters 1 through 10, upload to Google Drive, and update Firestore
$ErrorActionPreference = "Stop"

$apiKey = "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8"
$patchUrl = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=$apiKey&updateMask.fieldPaths=audioChapters"
$driveEndpoint = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec"

Write-Host "=== Starting Batch Audiobook Generator for Chapters 1-10 ===" -ForegroundColor Cyan

# Fetch current book document
$doc = Invoke-RestMethod -Uri 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196'
$chaps = $doc.fields.audioChapters.arrayValue.values

for ($idx = 1; $idx -lt $chaps.Count; $idx++) {
    $target = $chaps[$idx].mapValue.fields
    $title = $target.title.stringValue
    $text = $target.text.stringValue
    $currentUrl = $target.audioUrl.stringValue

    if ($currentUrl -like "*drive.google.com*") {
        Write-Host "[$idx/10] Already on Google Drive: $title" -ForegroundColor Green
        continue
    }

    Write-Host "`n----------------------------------------"
    Write-Host "Processing Chapter $idx - $title ($($text.Length) characters)..." -ForegroundColor Yellow

    # 1. Hugging Face Gradio TTS Call
    $payload = @{
        data = @(
            $text,
            "ar-EG-SalmaNeural - ar-EG (Female)",
            0,
            0
        )
    } | ConvertTo-Json -Compress

    Write-Host "  -> Requesting speech synthesis from Edge TTS..."
    $callResp = Invoke-RestMethod -Uri "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface" -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
    $eventId = $callResp.event_id
    Write-Host "  -> Event ID: $eventId, waiting for completion..."

    $sseUri = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface/$eventId"
    $downloadUrl = ""

    for ($attempt = 0; $attempt -lt 60; $attempt++) {
        Start-Sleep -Seconds 2
        $sseResp = Invoke-RestMethod -Uri $sseUri -Method Get
        if ($sseResp -match "event:\s*complete") {
            if ($sseResp -match '"url":\s*"([^"]+)"') {
                $downloadUrl = $matches[1]
            } elseif ($sseResp -match '"path":\s*"([^"]+)"') {
                $downloadUrl = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/file=" + $matches[1]
            }
            break
        }
    }

    if (-not $downloadUrl) {
        Write-Warning "  -> FAILED to synthesize speech for Chapter $idx ($title). Skipping..."
        continue
    }

    # 2. Download MP3
    $tempFile = Join-Path $PSScriptRoot "temp_chap_$idx.mp3"
    Write-Host "  -> Downloading MP3 file..."
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile
    $fileSize = (Get-Item $tempFile).Length
    Write-Host "  -> Downloaded successfully: $([Math]::Round($fileSize / 1024 / 1024, 2)) MB"

    # 3. Upload to Google Drive with retries
    Write-Host "  -> Uploading to Google Drive..."
    $bytes = [System.IO.File]::ReadAllBytes($tempFile)
    $base64 = [Convert]::ToBase64String($bytes)
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue

    $drivePayload = @{
        fileName   = "chapter_$idx.mp3"
        mimeType   = "audio/mp3"
        base64Data = $base64
    } | ConvertTo-Json -Compress

    $driveUrl = ""
    for ($uploadAttempt = 1; $uploadAttempt -le 3; $uploadAttempt++) {
        try {
            Write-Host "  -> Drive upload attempt $uploadAttempt of 3..."
            $driveRes = Invoke-RestMethod -Uri $driveEndpoint -Method Post -Body $drivePayload -ContentType "text/plain;charset=utf-8" -TimeoutSec 300
            if ($driveRes.status -eq "success" -and $driveRes.fileUrl) {
                $driveUrl = $driveRes.fileUrl
                break
            }
        } catch {
            Write-Warning "  -> Upload attempt $uploadAttempt failed: $_"
            Start-Sleep -Seconds 5
        }
    }

    if (-not $driveUrl) {
        Write-Warning "  -> Google Drive upload failed for Chapter $idx after 3 attempts. Skipping..."
        continue
    }

    Write-Host "  -> Successfully uploaded to Google Drive: $driveUrl" -ForegroundColor Green

    # 4. Immediate Firestore Update with retries on 429
    Write-Host "  -> Updating Firestore document..."
    $chaps[$idx].mapValue.fields.audioUrl.stringValue = $driveUrl

    $patchBody = @{
        fields = @{
            audioChapters = @{
                arrayValue = @{
                    values = $chaps
                }
            }
        }
    } | ConvertTo-Json -Depth 15

    for ($patchAttempt = 1; $patchAttempt -le 4; $patchAttempt++) {
        try {
            $updateRes = Invoke-RestMethod -Uri $patchUrl -Method Patch -Body $patchBody -ContentType "application/json; charset=utf-8"
            Write-Host "  -> Firestore updated successfully for Chapter $idx - $title" -ForegroundColor Green
            break
        } catch {
            Write-Warning "  -> Firestore update attempt $patchAttempt encountered: $_. Waiting 6 seconds..."
            Start-Sleep -Seconds 6
        }
    }

    # Small pause between chapters
    Start-Sleep -Seconds 3
}

Write-Host "`n=== All Chapters Processed Successfully! ===" -ForegroundColor Cyan
