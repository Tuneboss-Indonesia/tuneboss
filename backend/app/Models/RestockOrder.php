<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RestockOrder extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'product_id',
        'supplier_id',
        'restock_alert_id',
        'created_by',
        'received_by',
        'status',
        'quantity',
        'note',
        'ordered_at',
        'received_at',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'ordered_at' => 'datetime',
            'received_at' => 'datetime',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function restockAlert(): BelongsTo
    {
        return $this->belongsTo(RestockAlert::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
