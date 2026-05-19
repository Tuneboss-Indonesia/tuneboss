<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SupplierCollection;
use App\Http\Resources\SupplierResource;
use App\Models\AuditLog;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $suppliers = Supplier::query()
            ->when($request->query('search'), fn ($query, string $search) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->when($request->query('active') !== null, fn ($query) => $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return new SupplierCollection($suppliers);
    }

    public function store(Request $request)
    {
        $supplier = Supplier::create($this->validated($request));
        $this->audit($request, 'supplier.created', $supplier, after: $this->auditPayload($supplier));

        return (new SupplierResource($supplier))->response()->setStatusCode(201);
    }

    public function show(Supplier $supplier)
    {
        return new SupplierResource($supplier);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $before = $this->auditPayload($supplier);
        $supplier->update($this->validated($request, $supplier));
        $this->audit($request, 'supplier.updated', $supplier, $before, $this->auditPayload($supplier));

        return new SupplierResource($supplier);
    }

    public function destroy(Request $request, Supplier $supplier)
    {
        $before = $this->auditPayload($supplier);
        $supplier->update(['is_active' => false]);
        $this->audit($request, 'supplier.disabled', $supplier, $before, $this->auditPayload($supplier));

        return response()->json(['message' => 'Supplier dinonaktifkan.']);
    }

    private function validated(Request $request, ?Supplier $supplier = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180', Rule::unique('suppliers', 'name')->ignore($supplier?->id)],
            'phone' => ['nullable', 'string', 'max:60'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function audit(Request $request, string $action, Supplier $supplier, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'suppliers',
            'entity_id' => $supplier->id,
            'metadata' => array_filter(['before' => $before, 'after' => $after]),
        ]);
    }

    private function auditPayload(Supplier $supplier): array
    {
        return $supplier->only(['name', 'phone', 'email', 'address', 'is_active']);
    }
}
