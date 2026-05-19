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
        return response()->json($this->query($request)
            ->latest()
            ->paginate((int) $request->query('per_page', 15)));
    }

    public function export(Request $request): StreamedResponse
    {
        $filename = 'audit-logs-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($request) {
            $output = fopen('php://output', 'w');
            fputcsv($output, ['timestamp', 'user_name', 'user_email', 'action', 'entity', 'entity_id', 'metadata']);

            $this->query($request)
                ->latest()
                ->chunk(200, function ($logs) use ($output) {
                    foreach ($logs as $log) {
                        fputcsv($output, [
                            $log->created_at?->toISOString(),
                            $log->user?->name,
                            $log->user?->email,
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
            ->when($request->query('action'), fn ($query, string $action) => $query->where('action', $action))
            ->when($request->query('entity'), fn ($query, string $entity) => $query->where('entity', $entity))
            ->when($request->query('user_id'), fn ($query, string $userId) => $query->where('user_id', $userId))
            ->when($request->query('from'), fn ($query, string $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->query('to'), fn ($query, string $to) => $query->whereDate('created_at', '<=', $to));
    }
}
