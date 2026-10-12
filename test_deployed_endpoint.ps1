[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13

try {
    Write-Host "Sending GET to /api/tts-with-subtitles..."
    $r = Invoke-RestMethod -Uri "https://counseling-study-platform.vercel.app/api/tts-with-subtitles?q=test" -Method Get
    Write-Host "Status: $($r.status)"
    Write-Host "AudioBytes: $($r.audioBytes)"
    Write-Host "SRT Length: $($r.srt.Length)"
} catch {
    Write-Host "Exception: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        Write-Host "Error Body: $($reader.ReadToEnd())"
    }
}
