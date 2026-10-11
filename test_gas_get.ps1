[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12 -bor [System.Net.SecurityProtocolType]::Tls13
$url = "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec?id=11bD627DxRmvHuvwmZVEk14vSKYAHwWzz"
try {
    $r = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -MaximumRedirection 5
    Write-Host "AppsScript Status: " $r.StatusCode
    Write-Host "Content-Type: " $r.Headers['Content-Type']
    Write-Host "Length: " $r.Content.Length
    Write-Host "Snippet: " $r.Content.Substring(0, [Math]::Min(150, $r.Content.Length))
} catch {
    Write-Host "AppsScript Error: " $_.Exception.Message
}
