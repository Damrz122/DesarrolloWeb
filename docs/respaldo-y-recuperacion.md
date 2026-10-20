# Respaldo y recuperación ante borrado de volúmenes

Los volúmenes de Docker (`electronix_postgres_data` y `electronix_uploads`) **no son respaldos**. `docker compose down -v` los elimina. Los scripts de esta carpeta guardan una copia de PostgreSQL y de los uploads fuera de Docker, por defecto en `C:\Users\TU_USUARIO\ElectronixBackups`.

## Crear un respaldo

Con Docker iniciado, ejecuta desde PowerShell:

```powershell
.\scripts\Backup-Electronix.ps1
```

Cada respaldo queda en una carpeta con fecha y contiene `metadata.json`, un dump de PostgreSQL y, si existen, los uploads. El script elimina copias de más de 30 días; se puede ajustar:

```powershell
.\scripts\Backup-Electronix.ps1 -BackupRoot D:\Backups\Electronix -KeepDays 60
```

Instala el respaldo automático cada 15 minutos una sola vez:

```powershell
.\scripts\Install-ElectronixBackupTask.ps1
```

La tarea solo corre mientras tu sesión de Windows esté iniciada. La ruta elegida debe estar fuera del repositorio, de Docker y preferiblemente sincronizada o copiada a otro disco/nube. Para retirarla: `Unregister-ScheduledTask -TaskName 'Electronix - respaldo automatico'`.

## Recuperar después de `docker compose down -v`

1. No abras la aplicación ni ejecutes `docker compose up` manualmente todavía.
2. Ejecuta el script indicando una carpeta de respaldo:

```powershell
.\scripts\Restore-ElectronixBackup.ps1 -Backup C:\Users\TU_USUARIO\ElectronixBackups\20261020-150000
```

El script levanta PostgreSQL, detiene la aplicación para impedir que inicialice una base vacía, restaura la copia y vuelve a iniciar la aplicación. Pide confirmación porque reemplaza la base y los uploads actuales.

Si no existe ningún respaldo, al iniciar una base vacía Flyway crea la estructura y se cargan los datos demo: 50 usuarios exactos (incluido `Admin@gmail.com`), 200 productos, 200 pedidos/pagos aprobados y un conjunto reducido de chats.

## Regla esencial

Antes de ejecutar acciones destructivas (`down -v`, eliminación de volumen o recreación de base), crea y verifica un respaldo. Flyway puede reconstruir la estructura y los datos demo, pero no puede recuperar ventas, usuarios, configuraciones o archivos reales que nunca fueron respaldados.
