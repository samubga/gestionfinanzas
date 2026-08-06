# Script para crear el acceso directo de la aplicación en el Escritorio

$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "GestionFinanzas.lnk"
$scriptPath = "c:\Users\samub\Documents\antigravity\gestionfinanzas\start-app.ps1"
$workDir = "c:\Users\samub\Documents\antigravity\gestionfinanzas"

Write-Host "Creando acceso directo en el Escritorio..." -ForegroundColor White

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = "powershell.exe"
    $Shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File ""$scriptPath"""
    $Shortcut.WorkingDirectory = $workDir
    $Shortcut.Description = "Iniciar Gestión de Finanzas y abrir en el navegador"
    $Shortcut.IconLocation = "shell32.dll, 14" # Icono de globo terráqueo (enlace web)
    $Shortcut.Save()

    Write-Host "¡Acceso directo creado con éxito!" -ForegroundColor Green
    Write-Host "Ruta: $shortcutPath" -ForegroundColor Gray
} catch {
    Write-Error "Error al crear el acceso directo: $_"
    exit 1
}
