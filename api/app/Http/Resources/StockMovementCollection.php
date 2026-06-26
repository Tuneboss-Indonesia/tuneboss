<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\UsesSimplePagination;
use Illuminate\Http\Resources\Json\ResourceCollection;

class StockMovementCollection extends ResourceCollection
{
    use UsesSimplePagination;
}
