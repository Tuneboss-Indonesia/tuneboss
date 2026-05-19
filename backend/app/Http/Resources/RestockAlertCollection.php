<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\UsesSimplePagination;
use Illuminate\Http\Resources\Json\ResourceCollection;

class RestockAlertCollection extends ResourceCollection
{
    use UsesSimplePagination;
}
