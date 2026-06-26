<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'product_id',
        'operator_id',
        'sale_id',
        'type',
        'quantity',
        'serial_numbers',
        'before_quantity',
        'after_quantity',
        'party',
        'customer_name',
        'payment_status',
        'note',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'serial_numbers' => 'array',
            'before_quantity' => 'integer',
            'after_quantity' => 'integer',
        ];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function operator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'operator_id');
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
