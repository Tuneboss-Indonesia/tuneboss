<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\UsesSimplePagination;
use Illuminate\Http\Resources\Json\ResourceCollection;

class UserCollection extends ResourceCollection
{
    use UsesSimplePagination;
}
