<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class DatabaseBackup extends Command
{
    protected $signature = 'inventory:backup {--path= : Backup directory path}';

    protected $description = 'Create a MySQL/MariaDB database backup with mysqldump.';

    public function handle(): int
    {
        if (config('database.default') !== 'mysql') {
            $this->error('inventory:backup only supports the mysql database connection.');

            return self::FAILURE;
        }

        $connection = config('database.connections.mysql');
        $database = $connection['database'] ?? null;

        if (! $database) {
            $this->error('Database name is not configured.');

            return self::FAILURE;
        }

        $directory = $this->option('path') ?: storage_path('app/backups');
        File::ensureDirectoryExists($directory);

        $filename = $database.'-'.now()->format('Ymd-His').'.sql';
        $path = rtrim($directory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.$filename;

        $command = [
            'mysqldump',
            '--single-transaction',
            '--quick',
            '--host='.$connection['host'],
            '--port='.(string) $connection['port'],
            '--user='.$connection['username'],
        ];

        if (! empty($connection['password'])) {
            $command[] = '--password='.$connection['password'];
        }

        $command[] = $database;

        $process = new Process($command);
        $process->setTimeout(300);
        $process->run();

        if (! $process->isSuccessful()) {
            $this->error(trim($process->getErrorOutput()) ?: 'mysqldump failed.');

            return self::FAILURE;
        }

        File::put($path, $process->getOutput());

        $this->info('Backup created: '.$path);

        return self::SUCCESS;
    }
}
