<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = $this->query($request)
            ->latest()
            ->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'data' => $logs->getCollection()->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'entity' => $log->entity,
                'entity_id' => $log->entity_id,
                'metadata' => $log->metadata,
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                    'role' => $log->user->role,
                ] : null,
                'createdAt' => $log->created_at?->toISOString(),
                'updatedAt' => $log->updated_at?->toISOString(),
            ])->values(),
            'links' => [
                'first' => $logs->url(1),
                'last' => $logs->url($logs->lastPage()),
                'prev' => $logs->previousPageUrl(),
                'next' => $logs->nextPageUrl(),
            ],
            'meta' => [
                'currentPage' => $logs->currentPage(),
                'from' => $logs->firstItem(),
                'lastPage' => $logs->lastPage(),
                'perPage' => $logs->perPage(),
                'to' => $logs->lastItem(),
                'total' => $logs->total(),
            ],
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filename = 'audit-logs-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($request) {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['timestamp', 'user_name', 'user_email', 'user_role', 'action', 'entity', 'entity_id', 'metadata']);

            $this->query($request)
                ->latest()
                ->chunk(200, function ($logs) use ($output) {
                    foreach ($logs as $log) {
                        fputcsv($output, [
                            $log->created_at?->toISOString(),
                            $log->user?->name,
                            $log->user?->email,
                            $log->user?->role,
                            $log->action,
                            $log->entity,
                            $log->entity_id,
                            json_encode($log->metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                        ]);
                    }
                });

            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function query(Request $request)
    {
        return AuditLog::query()
            ->with('user:id,name,email,role')
            ->when($request->query('search'), function ($query, string $search) {
                $term = "%{$search}%";
                $query->where(function ($query) use ($term) {
                    $query->where('action', 'like', $term)
                        ->orWhere('entity', 'like', $term)
                        ->orWhere('entity_id', 'like', $term)
                        ->orWhereHas('user', function ($userQuery) use ($term) {
                            $userQuery->where('name', 'like', $term)
                                ->orWhere('email', 'like', $term);
                        });
                });
            })
            ->when($request->query('action'), fn ($query, string $action) => $query->where('action', $action))
            ->when($request->query('entity'), fn ($query, string $entity) => $query->where('entity', $entity))
            ->when($request->query('user_id'), fn ($query, string $userId) => $query->where('user_id', $userId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to));
    }
}
