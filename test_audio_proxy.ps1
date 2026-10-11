[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
$url = 'https://counseling-study-platform.vercel.app/api/audio-proxy?id=11bD627DxRmvHuvwmZVEk14vSKYAHwWzz'
try {
    $res = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing
    Write-Host "Status: " $res.StatusCode
    Write-Host "Content-Type: " $res.Headers['Content-Type']
    Write-Host "Length: " $res.Headers['Content-Length']
} catch {
    Write-Host "Error: " $_.Exception.Message
}
