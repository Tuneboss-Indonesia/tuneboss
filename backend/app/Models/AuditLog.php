<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = ['user_id', 'action', 'entity', 'entity_id', 'metadata'];

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
