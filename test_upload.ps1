$bytes = [System.IO.File]::ReadAllBytes("sample_prompt_text.txt")
$b64 = [Convert]::ToBase64String($bytes)
$json = @{
    fileName = "test_diag.txt"
    mimeType = "text/plain"
    base64Data = $b64
} | ConvertTo-Json

try {
    $r = Invoke-RestMethod -Uri "https://script.google.com/macros/s/AKfycbzVQ7NkIeykIhT8vU61Chphju1nnOjuEp1MvxKGnx2bBQix0MaV5R0z5cELFs5CSiJW/exec" -Method Post -Body $json -ContentType "text/plain;charset=utf-8"
    Write-Host "RES:" ($r | ConvertTo-Json)
} catch {
    Write-Host "ERR:" $_.Exception.Message
}
