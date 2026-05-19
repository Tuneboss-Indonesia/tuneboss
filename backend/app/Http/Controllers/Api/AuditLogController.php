<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(AuditLog::query()
            ->with('user:id,name,email,role')
            ->when($request->query('action'), fn ($query, string $action) => $query->where('action', $action))
            ->when($request->query('entity'), fn ($query, string $entity) => $query->where('entity', $entity))
            ->when($request->query('user_id'), fn ($query, string $userId) => $query->where('user_id', $userId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to))
            ->latest()
            ->paginate((int) $request->query('per_page', 15)));
    }
}
