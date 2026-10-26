$ErrorActionPreference = "Stop"
$base = "http://localhost:8000/api"

# 1. Login superadmin
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType "application/json" -Body (@{
    usu_email = "superadmin@motopreview.com"
    password  = "SuperAdmin#2026"
} | ConvertTo-Json)
$token = $login.token
if (-not $token) { $token = $login.access_token }
if (-not $token) { $token = $login.access }
Write-Host "1) LOGIN superadmin OK -> token=$($token.Substring(0,20))..."
Write-Host "   usuario: $($login.usuario.usu_email)  id_rol: $($login.usuario.id_rol)"
$headers = @{ Authorization = "Bearer $token" }

$rolAdmin = "11111111-0000-0000-0000-000000000001"

# 0. Limpiar roles de pruebas anteriores
$roles = Invoke-RestMethod -Method Get -Uri "$base/roles" -Headers $headers
foreach ($r in $roles) {
    if ($r.nombre_rol.StartsWith("[TEST]")) {
        Invoke-RestMethod -Method Delete -Uri "$base/roles/$($r.id_rol)" -Headers $headers | Out-Null
        Write-Host "0) Rol de prueba eliminado: $($r.nombre_rol) ($($r.id_rol))"
    }
}

# 2. Matriz para el rol Admin
$matriz = Invoke-RestMethod -Method Get -Uri "$base/recursos-con-permisos?rol_id=$rolAdmin" -Headers $headers
$totalAcciones = 0; $concedidas = 0
foreach ($rec in $matriz) {
    foreach ($acc in $rec.acciones) {
        $totalAcciones++
        if ($acc.scope) { $concedidas++ }
    }
}
Write-Host "2) GET matriz Admin -> recursos=$($matriz.Count)  combinaciones=$totalAcciones  concedidas=$concedidas"
$primera = $matriz[0]
Write-Host "   ejemplo recurso '$($primera.codigo)': acciones=$(($primera.acciones | ForEach-Object { "$($_.accion_codigo)[$($_.scope)]" }) -join ', ')"

# 3. Crear rol temporal
$temp = Invoke-RestMethod -Method Post -Uri "$base/roles" -Headers $headers -ContentType "application/json" -Body (@{
    nombre_rol = "[TEST] Temporal verificacion"; activo = $true; es_superadmin = $false
} | ConvertTo-Json)
$idTemp = $temp.id_rol
Write-Host "3) POST /roles temporal OK -> id=$idTemp"

# 4. Matriz del rol temporal (todo sin conceder)
$matrizTemp = Invoke-RestMethod -Method Get -Uri "$base/recursos-con-permisos?rol_id=$idTemp" -Headers $headers
$concedidasTemp = ($matrizTemp | ForEach-Object { $_.acciones } | Where-Object { $_.scope }).Count
Write-Host "4) Matriz rol nuevo -> concedidas=$concedidasTemp (esperado 0)"

# 5. Otorgar 1 permiso (productos:leer del Admin)
$permiso = $null
foreach ($rec in $matriz) {
    if ($rec.codigo -eq "productos") {
        $permiso = $rec.acciones | Where-Object { $_.accion_codigo -eq "leer" } | Select-Object -First 1
    }
}
$payload = @{ permisos = @(@{ id_recurso_accion = $permiso.id_recurso_accion; scope = "tienda" }) } | ConvertTo-Json -Depth 5
$put = Invoke-RestMethod -Method Put -Uri "$base/roles/$idTemp/permisos" -Headers $headers -ContentType "application/json" -Body $payload
Write-Host "5) PUT otorgar productos:leer[tienda] -> $($put | ConvertTo-Json -Compress)"

# 6. Verificar
$matrizTemp = Invoke-RestMethod -Method Get -Uri "$base/recursos-con-permisos?rol_id=$idTemp" -Headers $headers
$concedidasTemp = ($matrizTemp | ForEach-Object { $_.acciones } | Where-Object { $_.scope }).Count
$detalle = $matrizTemp | ForEach-Object { $_.acciones } | Where-Object { $_.scope } | Select-Object -First 1
Write-Host "6) Matriz rol tras otorgar -> concedidas=$concedidasTemp (esperado 1)  detalle: $($detalle.accion_codigo) scope=$($detalle.scope)"

# 7. Revocar todos (lista vacia)
$put2 = Invoke-RestMethod -Method Put -Uri "$base/roles/$idTemp/permisos" -Headers $headers -ContentType "application/json" -Body '{"permisos": []}'
$matrizTemp = Invoke-RestMethod -Method Get -Uri "$base/recursos-con-permisos?rol_id=$idTemp" -Headers $headers
$concedidasTemp = ($matrizTemp | ForEach-Object { $_.acciones } | Where-Object { $_.scope }).Count
Write-Host "7) PUT lista vacia (revocar todos) -> concedidas=$concedidasTemp (esperado 0)"

# 8. Eliminar rol temporal
Invoke-RestMethod -Method Delete -Uri "$base/roles/$idTemp" -Headers $headers | Out-Null
Write-Host "8) DELETE rol temporal OK"

Write-Host ""
Write-Host "VERIFICACION END-TO-END COMPLETA"
