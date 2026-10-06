Add-Type -AssemblyName "System.Web.Extensions"
$ErrorActionPreference = "Stop"

$files = Get-ChildItem -Path "src" -Recurse -Filter "*.js"
Write-Host "Checking $($files.Count) JavaScript files..."

# We can use Windows Script Host or JScript engine via COM or .NET to parse JS syntax
$sc = New-Object -ComObject "MSScriptControl.ScriptControl"
$sc.Language = "JScript"

foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    try {
        # Check syntax by compiling into script engine
        $sc.AddCode("function __test__() { " + $content + " }")
        Write-Host "OK: $($file.Name)" -ForegroundColor Green
    } catch {
        Write-Host "ERROR in $($file.FullName):" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Yellow
    }
}
