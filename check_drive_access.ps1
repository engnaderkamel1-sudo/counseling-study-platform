$fileId = '11bD627DxRmvHuvwmZVEk14vSKYAHwWzz'
$url = 'https://drive.usercontent.google.com/download?id=' + $fileId + '&export=download&confirm=t'
try {
    $resp = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -UserAgent 'Mozilla/5.0'
    Write-Host "Status: " $resp.StatusCode
    Write-Host "Content-Type: " $resp.Headers['Content-Type']
    Write-Host "Length: " $resp.Headers['Content-Length']
} catch {
    Write-Host "Drive error: " $_.Exception.Message
}

$previewUrl = 'https://drive.google.com/file/d/' + $fileId + '/preview'
try {
    $resp2 = Invoke-WebRequest -Uri $previewUrl -Method Get -UseBasicParsing -UserAgent 'Mozilla/5.0'
    Write-Host "Preview Status: " $resp2.StatusCode
    if ($resp2.Content -match 'You need access' -or $resp2.Content -match 'request access' -or $resp2.Content -match 'طلب الوصول') {
        Write-Host "PERMISSION ISSUE: File is private!"
    } else {
        Write-Host "Preview is accessible publicly!"
    }
} catch {
    Write-Host "Preview error: " $_.Exception.Message
}
