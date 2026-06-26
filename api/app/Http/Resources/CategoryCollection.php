<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\UsesSimplePagination;
use Illuminate\Http\Resources\Json\ResourceCollection;

class CategoryCollection extends ResourceCollection
{
    use UsesSimplePagination;
}
