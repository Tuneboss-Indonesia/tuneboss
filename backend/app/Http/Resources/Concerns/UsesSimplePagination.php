<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Http\Request;

trait UsesSimplePagination
{
    public function paginationInformation(Request $request, array $paginated, array $default): array
    {
        return [
            'links' => [
                'first' => $paginated['first_page_url'] ?? null,
                'last' => $paginated['last_page_url'] ?? null,
                'prev' => $paginated['prev_page_url'] ?? null,
                'next' => $paginated['next_page_url'] ?? null,
            ],
            'meta' => [
                'currentPage' => $paginated['current_page'],
                'from' => $paginated['from'],
                'lastPage' => $paginated['last_page'],
                'perPage' => $paginated['per_page'],
                'to' => $paginated['to'],
                'total' => $paginated['total'],
            ],
        ];
    }
}
