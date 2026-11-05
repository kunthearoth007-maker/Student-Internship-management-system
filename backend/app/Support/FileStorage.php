<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class FileStorage
{
    public static function store(UploadedFile $file, string $directory): string
    {
        return $file->store($directory, 'public');
    }

    public static function replace(?string $oldPath, UploadedFile $file, string $directory): string
    {
        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        return self::store($file, $directory);
    }

    public static function delete(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
