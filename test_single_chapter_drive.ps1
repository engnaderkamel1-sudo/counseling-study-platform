param(
    [int]$ChapterIndex = 0
)

$ErrorActionPreference = "Stop"

Write-Host "Fetching book data from Firestore..."
$doc = Invoke-RestMethod -Uri 'https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196'
$chaps = $doc.fields.audioChapters.arrayValue.values
$target = $chaps[$ChapterIndex].mapValue.fields
$title = $target.title.stringValue
$text = $target.text.stringValue

Write-Host "Chapter: $title (Length: $($text.Length) chars)"

# 1. Gradio Call
$payload = @{
    data = @(
        $text,
        "ar-EG-SalmaNeural - ar-EG (Female)",
        0,
        0
    )
} | ConvertTo-Json -Compress

Write-Host "Requesting TTS synthesis from Hugging Face..."
$callResp = Invoke-RestMethod -Uri "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface" -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
$eventId = $callResp.event_id
Write-Host "Event ID: $eventId, waiting for completion..."

$sseUri = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface/$eventId"
$downloadUrl = ""

for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 1
    $sseResp = Invoke-RestMethod -Uri $sseUri -Method Get
    if ($sseResp -match "event:\s*complete") {
        Write-Host "Completed event received!"
        if ($sseResp -match '"url":\s*"([^"]+)"') {
            $downloadUrl = $matches[1]
        } elseif ($sseResp -match '"path":\s*"([^"]+)"') {
            $downloadUrl = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/file=" + $matches[1]
        }
        break
    }
}

if (-not $downloadUrl) {
    Write-Error "Failed to obtain download URL from TTS service"
    exit 1
}

Write-Host "Downloading immediately: $downloadUrl..."
$tempFile = Join-Path $PSScriptRoot "temp_download_$ChapterIndex.mp3"
Invoke-WebRequest -Uri $downloadUrl -OutFile $tempFile
$len = (Get-Item $tempFile).Length
Write-Host "Downloaded successfully: $len bytes"

# 2. Upload to Google Drive
Write-Host "Encoding to Base64 and uploading to Google Drive..."
$bytes = [System.IO.File]::ReadAllBytes($tempFile)
$base64 = [Convert]::ToBase64String($bytes)
Remove-Item $tempFile -Force

$cleanFileName = "chapter_" + $ChapterIndex + ".mp3"
$drivePayload = @{
    fileName   = $cleanFileName
    mimeType   = "audio/mp3"
    base64Data = $base64
} | ConvertTo-Json -Compress

$endpoint = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec"
$driveRes = Invoke-RestMethod -Uri $endpoint -Method Post -Body $drivePayload -ContentType "text/plain;charset=utf-8"

if ($driveRes.status -ne "success" -or -not $driveRes.fileUrl) {
    Write-Error "Drive upload failed: $($driveRes | ConvertTo-Json)"
    exit 1
}

$permanentDriveUrl = $driveRes.fileUrl
Write-Host "SUCCESS! Google Drive URL: $permanentDriveUrl" -ForegroundColor Green

# 3. Update Firestore via REST PATCH
Write-Host "Updating Firestore with permanent Drive URL..."
$apiKey = "AIzaSyBgodgcRNLnPJrZMqJ_d2pdnyTvESDVeT8"
$patchUrl = "https://firestore.googleapis.com/v1/projects/counseling-study-app/databases/(default)/documents/books/book-1791651887196?key=$apiKey&updateMask.fieldPaths=audioChapters"

# Replace audioUrl of target chapter in chaps array
$newChaps = @()
for ($c = 0; $c -lt $chaps.Count; $c++) {
    $item = $chaps[$c]
    if ($c -eq $ChapterIndex) {
        $item.mapValue.fields.audioUrl.stringValue = $permanentDriveUrl
    }
    $newChaps += $item
}

$patchBody = @{
    fields = @{
        audioChapters = @{
            arrayValue = @{
                values = $newChaps
            }
        }
    }
} | ConvertTo-Json -Depth 10

$updateRes = Invoke-RestMethod -Uri $patchUrl -Method Patch -Body $patchBody -ContentType "application/json"
Write-Host "FIRESTORE UPDATED SUCCESSFULLY FOR CHAPTER: $title!" -ForegroundColor Green
