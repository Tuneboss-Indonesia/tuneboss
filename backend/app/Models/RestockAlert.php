<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RestockAlert extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'product_id',
        'status',
        'severity',
        'current_stock',
        'threshold',
        'acknowledged_by',
        'acknowledged_at',
        'resolved_by',
        'resolved_at',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'current_stock' => 'integer',
            'threshold' => 'integer',
            'acknowledged_at' => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function acknowledgedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'acknowledged_by');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }

    public function restockOrders(): HasMany
    {
        return $this->hasMany(RestockOrder::class);
    }
}
