# Script de inicio para la aplicacion de Gestion de Finanzas
# Este script verifica Docker, levanta los contenedores y abre la web en el navegador.

$workspaceDir = "c:\Users\samub\Documents\antigravity\gestionfinanzas"
$dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$url = "http://localhost:3000"

Clear-Host
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "         INICIANDO GESTION DE FINANZAS            " -ForegroundColor Cyan -NoNewline
Write-Host " (Docker)" -ForegroundColor Gray
Write-Host "==================================================" -ForegroundColor Cyan

# Funcion para verificar si Docker deamon esta respondiendo
function Test-Docker {
    & docker info > $null 2>&1
    return $LASTEXITCODE -eq 0
}

# 1. Comprobar si Docker esta activo
Write-Host "[1/4] Comprobando el estado de Docker..." -ForegroundColor White
if (-not (Test-Docker)) {
    Write-Host "-> Docker no esta en ejecucion. Iniciando Docker Desktop..." -ForegroundColor Yellow
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
        
        # Esperar a que Docker se inicie (maximo 60 segundos)
        $timeout = 60
        $elapsed = 0
        while (-not (Test-Docker) -and $elapsed -lt $timeout) {
            Write-Host "   Esperando a que el motor de Docker responda... ($elapsed s / $timeout s)" -ForegroundColor Gray
            Start-Sleep -Seconds 3
            $elapsed += 3
        }
        
        if (-not (Test-Docker)) {
            Write-Host ""
            Write-Host "[ERROR] No se pudo iniciar el motor de Docker a tiempo." -ForegroundColor Red
            Write-Host "Por favor, abre Docker Desktop manualmente y vuelve a intentarlo." -ForegroundColor Red
            Write-Host ""
            Read-Host "Presiona Enter para cerrar..."
            exit 1
        }
        Write-Host "-> Docker iniciado correctamente." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] No se encontro Docker Desktop en la ruta standard:" -ForegroundColor Red
        Write-Host "   $dockerPath" -ForegroundColor Red
        Write-Host ""
        Read-Host "Presiona Enter para cerrar..."
        exit 1
    }
} else {
    Write-Host "-> Docker ya esta activo y respondiendo." -ForegroundColor Green
}

# 2. Levantar los contenedores de Docker Compose
Write-Host ""
Write-Host "[2/4] Iniciando contenedores de la aplicacion..." -ForegroundColor White
Set-Location -Path $workspaceDir
& docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Error al ejecutar 'docker compose up -d'." -ForegroundColor Red
    Write-Host ""
    Read-Host "Presiona Enter para cerrar..."
    exit 1
}
Write-Host "-> Contenedores levantados con exito." -ForegroundColor Green

# 3. Esperar a que la web en el puerto 3000 este lista
Write-Host ""
Write-Host "[3/4] Comprobando disponibilidad de la web (puerto 3000)..." -ForegroundColor White
$portTimeout = 30
$portElapsed = 0
$webReady = $false

while (-not $webReady -and $portElapsed -lt $portTimeout) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        # Timeout corto de conexion (1 segundo)
        $connect = $tcp.BeginConnect("localhost", 3000, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($success) {
            $tcp.EndConnect($connect)
            $webReady = $true
        }
        $tcp.Close()
    } catch {
        # Error al conectar, seguimos intentando
    }
    
    if (-not $webReady) {
        Start-Sleep -Seconds 1
        $portElapsed += 1
    }
}

if ($webReady) {
    Write-Host "-> La web ya esta activa y respondiendo." -ForegroundColor Green
} else {
    Write-Host "-> La web tarda en responder, intentaremos abrir el navegador de todos modos." -ForegroundColor Yellow
}

# 4. Abrir la URL en el navegador por defecto
Write-Host ""
Write-Host "[4/4] Abriendo la aplicacion en tu navegador por defecto..." -ForegroundColor White
Start-Process $url

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host " Todo listo! La aplicacion se ha iniciado.       " -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Start-Sleep -Seconds 3
