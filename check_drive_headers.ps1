$fileId = '11bD627DxRmvHuvwmZVEk14vSKYAHwWzz'
$url = 'https://drive.usercontent.google.com/download?id=' + $fileId + '&export=download&confirm=t'
$res = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing
foreach ($k in $res.Headers.Keys) {
    Write-Host "$k : $($res.Headers[$k])"
}
