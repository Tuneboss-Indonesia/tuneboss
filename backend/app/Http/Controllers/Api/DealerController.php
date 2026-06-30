<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DealerResource;
use App\Models\AuditLog;
use App\Models\Dealer;
use Illuminate\Http\Request;

class DealerController extends Controller
{
    public function index(Request $request)
    {
        return DealerResource::collection(
            Dealer::query()
                ->when($request->query('search'), fn ($query, string $search) => $query->where(fn ($query) => $query->where('name', 'like', "%{$search}%")->orWhere('address', 'like', "%{$search}%")->orWhere('phone', 'like', "%{$search}%")))
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $dealer = Dealer::create($this->validated($request));
        $this->audit($request, 'dealer.created', $dealer, after: $dealer->only(['name', 'address', 'phone']));

        return (new DealerResource($dealer))->response()->setStatusCode(201);
    }

    public function update(Request $request, Dealer $dealer)
    {
        $before = $dealer->only(['name', 'address', 'phone']);
        $dealer->update($this->validated($request));
        $this->audit($request, 'dealer.updated', $dealer, $before, $dealer->only(['name', 'address', 'phone']));

        return new DealerResource($dealer);
    }

    public function destroy(Request $request, Dealer $dealer)
    {
        $before = $dealer->only(['name', 'address', 'phone']);
        $dealer->delete();
        $this->audit($request, 'dealer.deleted', $dealer, $before);

        return response()->json(['message' => 'Dealer dihapus.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180'],
            'address' => ['nullable', 'string'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);
    }

    private function audit(Request $request, string $action, Dealer $dealer, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'dealers',
            'entity_id' => $dealer->id,
            'metadata' => array_filter(['before' => $before, 'after' => $after]),
        ]);
    }
}
