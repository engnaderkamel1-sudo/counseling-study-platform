$script = @'
$text = [System.IO.File]::ReadAllText("$PSScriptRoot\sample_prompt_text.txt", [System.Text.Encoding]::UTF8)

$voices = @(
    [PSCustomObject]@{ VoiceKey = "ar-EG-SalmaNeural - ar-EG (Female)"; File = "sample_1_salma_egypt.mp3"; Desc = "Salma (Egypt)" },
    [PSCustomObject]@{ VoiceKey = "ar-SA-ZariyahNeural - ar-SA (Female)"; File = "sample_2_zariyah_saudi.mp3"; Desc = "Zariyah (Saudi)" },
    [PSCustomObject]@{ VoiceKey = "ar-AE-FatimaNeural - ar-AE (Female)"; File = "sample_3_fatima_emirates.mp3"; Desc = "Fatima (Emirates)" }
)

foreach ($v in $voices) {
    Write-Host "Calling TTS for: $($v.Desc)..."
    $payload = @{
        data = @(
            $text,
            $v.VoiceKey,
            0,
            0
        )
    } | ConvertTo-Json -Compress

    try {
        $callResp = Invoke-RestMethod -Uri "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface" -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
        $eventId = $callResp.event_id
        Write-Host "Event ID: $eventId, waiting for result..."

        $sseUri = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/call/tts_interface/$eventId"
        $completed = $false
        $downloadUrl = ""

        for ($i = 0; $i -lt 20; $i++) {
            Start-Sleep -Seconds 1
            $sseResp = Invoke-RestMethod -Uri $sseUri -Method Get
            if ($sseResp -match "event:\s*complete" -and $sseResp -match 'data:\s*\[(.*?)\]') {
                $rawJson = $matches[1]
                Write-Host "Completed event received!"
                if ($sseResp -match '"url":\s*"([^"]+)"') {
                    $downloadUrl = $matches[1]
                } elseif ($sseResp -match '"path":\s*"([^"]+)"') {
                    $downloadUrl = "https://innoai-edge-tts-text-to-speech.hf.space/gradio_api/file=" + $matches[1]
                }
                break
            }
        }

        if ($downloadUrl) {
            $outPath = Join-Path $PSScriptRoot $v.File
            Write-Host "Downloading: $downloadUrl -> $($v.File)"
            Invoke-WebRequest -Uri $downloadUrl -OutFile $outPath
            $len = (Get-Item $outPath).Length
            Write-Host "SUCCESS: Generated $($v.File) ($len bytes)"
        } else {
            Write-Warning "Could not find audio URL for $($v.Desc)"
        }
    } catch {
        Write-Error "Error for $($v.Desc): $_"
    }
}
'@

[System.IO.File]::WriteAllText("$PSScriptRoot\test_gradio_sse.ps1", $script, [System.Text.Encoding]::UTF8)
