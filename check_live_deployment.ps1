$r = Invoke-WebRequest -Uri "https://counseling-study-platform.vercel.app" -UseBasicParsing
if ($r.Content -like "*nocache*") {
    Write-Host "Still old bundle on Vercel"
} else {
    Write-Host "LIVE: New bundle is active on Vercel!"
}
