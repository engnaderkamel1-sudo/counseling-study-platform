[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
$url = "https://corsproxy.io/?" + [System.Uri]::EscapeDataString("https://drive.usercontent.google.com/download?id=11bD627DxRmvHuvwmZVEk14vSKYAHwWzz&export=download&confirm=t")
try {
    $r = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
    Write-Host "CORSProxy Status: " $r.StatusCode
    Write-Host "Content-Type: " $r.Headers['Content-Type']
} catch {
    Write-Host "CORSProxy Error: " $_.Exception.Message
}
