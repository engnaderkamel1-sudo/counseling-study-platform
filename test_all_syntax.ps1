Add-Type -AssemblyName Microsoft.JScript
$codeProvider = New-Object Microsoft.JScript.JScriptCodeProvider
$params = New-Object System.CodeDom.Compiler.CompilerParameters
$params.GenerateInMemory = $true

$files = Get-ChildItem -Path "src" -Filter "*.js" -Recurse

foreach ($f in $files) {
    $results = $codeProvider.CompileAssemblyFromFile($params, $f.FullName)
    if ($results.Errors.Count -gt 0) {
        Write-Host "ERRORS in $($f.Name):" -ForegroundColor Red
        foreach ($err in $results.Errors) {
            Write-Host "  Line $($err.Line), Col $($err.Column): $($err.ErrorText)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "OK: $($f.Name)" -ForegroundColor Green
    }
}
