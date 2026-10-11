[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
$fileId = '11bD627DxRmvHuvwmZVEk14vSKYAHwWzz'
$urls = @(
    "https://drive.google.com/uc?export=download&id=$fileId",
    "https://docs.google.com/uc?export=download&id=$fileId",
    "https://lh3.googleusercontent.com/d/$fileId"
)

foreach ($u in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -MaximumRedirection 5
        Write-Host "URL: $u"
        Write-Host "  Status: " $r.StatusCode
        Write-Host "  Content-Type: " $r.Headers['Content-Type']
        Write-Host "  CORP: " $r.Headers['Cross-Origin-Resource-Policy']
    } catch {
        Write-Host "URL: $u -> Error: " $_.Exception.Message
    }
}
