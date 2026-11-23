# Demo Semana 11 - evidencia de los cuatro casos
# Uso: con la API corriendo en http://localhost:3000, ejecutar:
#   powershell -ExecutionPolicy Bypass -File .\docs\etapa-3-demo.ps1
#
# Las cuentas de practica ya existen en la base local:
#   owner.teacher@example.test  (teacher, dueno del curso 4)
#   other.teacher@example.test  (teacher, ajeno al curso 4)
#   admin.etapa3@example.test   (admin)
# Contrasena: CourseHub-2026!

$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000'
$courseId = 4
$tmp = Join-Path $env:TEMP 'coursehub-etapa3'
New-Item -ItemType Directory -Force $tmp | Out-Null

function New-JsonFile {
    param([string]$Path, [hashtable]$Data)
    ($Data | ConvertTo-Json -Compress) |
        Set-Content -Path $Path -Encoding ascii -NoNewline
}

function Get-Token {
    param([string]$Email)
    $file = Join-Path $tmp 'login.json'
    New-JsonFile $file @{ email = $Email; password = 'CourseHub-2026!' }
    $token = (curl.exe -s -X POST "$base/auth/login" `
        -H 'Content-Type: application/json' `
        --data-binary "@$file" | ConvertFrom-Json).accessToken
    if (-not $token) {
        throw "No se pudo iniciar sesion con $Email. Verifica que la API este arriba y la cuenta exista."
    }
    return $token
}

function Invoke-DemoCase {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [string]$Token,
        [string]$RequestId,
        [string]$BodyFile
    )
    $out = Join-Path $tmp 'response.json'
    $status = curl.exe -s -o $out -w '%{http_code}' -X $Method $Url `
        -H "Authorization: Bearer $Token" `
        -H 'Content-Type: application/json' `
        -H "x-request-id: $RequestId" `
        --data-binary "@$BodyFile"

    Write-Host ''
    Write-Host "=== $Name ===" -ForegroundColor Cyan
    Write-Host "HTTP $status   x-request-id: $RequestId" -ForegroundColor Yellow
    Get-Content $out -Raw
}

Write-Host 'Iniciando sesion con las cuentas de practica...' -ForegroundColor DarkGray
$ownerToken = Get-Token 'owner.teacher@example.test'
$otherToken = Get-Token 'other.teacher@example.test'

$updateBody = Join-Path $tmp 'update.json'
$noopBody = Join-Path $tmp 'noop.json'
New-JsonFile $updateBody @{ title = 'Arquitectura mantenible (actualizado)' }
New-JsonFile $noopBody @{ title = 'No se aplica' }

Invoke-DemoCase -Name '1. Correcta (docente propietario)' `
    -Method PATCH -Url "$base/courses/$courseId" -Token $ownerToken `
    -RequestId 'demo-correcto' -BodyFile $updateBody

Invoke-DemoCase -Name '2. Identificador invalido' `
    -Method PATCH -Url "$base/courses/abc" -Token $ownerToken `
    -RequestId 'demo-id-invalido' -BodyFile $noopBody

Invoke-DemoCase -Name '3. Recurso inexistente' `
    -Method PATCH -Url "$base/courses/999999" -Token $ownerToken `
    -RequestId 'demo-no-existe' -BodyFile $noopBody

Invoke-DemoCase -Name '4. Prohibida (docente ajeno)' `
    -Method PATCH -Url "$base/courses/$courseId" -Token $otherToken `
    -RequestId 'demo-prohibido' -BodyFile $noopBody

Write-Host ''
Write-Host 'Listo. Las cuatro respuestas deben tener los mismos campos:' -ForegroundColor Green
Write-Host 'statusCode, error, message, path, timestamp, requestId (y ninguna propiedad stack).'
Write-Host 'Revisa la terminal de la API: cada requestId debe aparecer en una linea http_request'
Write-Host 'con method, path, statusCode y durationMs, sin body, headers ni tokens.'
