$script = @'
$text = [System.IO.File]::ReadAllText("$PSScriptRoot\sample_prompt_text.txt", [System.Text.Encoding]::UTF8)

$voices = @(
    [PSCustomObject]@{ VoiceKey = "ar-EG-SalmaNeural - ar-EG (Female)"; File = "sample_1_salma_egypt.mp3"; Desc = "Salma (Egypt)" },
    [PSCustomObject]@{ VoiceKey = "ar-SA-ZariyahNeural - ar-SA (Female)"; File = "sample_2_zariyah_saudi.mp3"; Desc = "Zariyah (Saudi)" },
    [PSCustomObject]@{ VoiceKey = "ar-AE-FatimaNeural - ar-AE (Female)"; File = "sample_3_fatima_emirates.mp3"; Desc = "Fatima (Emirates)" }
)

foreach ($v in $voices) {
    Write-Host "Generating: $($v.Desc)..."
    $payload = @{
        data = @(
            $text,
            $v.VoiceKey,
            0,
            0
        )
    } | ConvertTo-Json -Compress

    try {
        $resp = Invoke-RestMethod -Uri "https://innoai-edge-tts-text-to-speech.hf.space/api/predict" -Method Post -Body $payload -ContentType "application/json; charset=utf-8"
        if ($resp.data -and $resp.data[0]) {
            $audioFileObj = $resp.data[0]
            $downloadUrl = ""
            if ($audioFileObj.name) {
                $downloadUrl = "https://innoai-edge-tts-text-to-speech.hf.space/file=" + $audioFileObj.name
            } elseif ($audioFileObj.url) {
                $downloadUrl = $audioFileObj.url
            }
            if ($downloadUrl) {
                $outPath = Join-Path $PSScriptRoot $v.File
                Invoke-WebRequest -Uri $downloadUrl -OutFile $outPath
                $len = (Get-Item $outPath).Length
                Write-Host "SUCCESS: Generated $($v.File) ($len bytes)"
            }
        } else {
            Write-Warning "No audio data returned"
        }
    } catch {
        Write-Error "Error: $_"
    }
}
'@

[System.IO.File]::WriteAllText("$PSScriptRoot\generate_samples_bridge.ps1", $script, [System.Text.Encoding]::UTF8)
