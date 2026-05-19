<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CustomerCollection;
use App\Http\Resources\CustomerResource;
use App\Models\AuditLog;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $customers = Customer::query()
            ->when($request->query('search'), fn ($query, string $search) => $query->where(fn ($query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('phone', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->when($request->query('active') !== null, fn ($query) => $query->where('is_active', filter_var($request->query('active'), FILTER_VALIDATE_BOOLEAN)))
            ->orderBy('name')
            ->paginate((int) $request->query('per_page', 15));

        return new CustomerCollection($customers);
    }

    public function store(Request $request)
    {
        $customer = Customer::create($this->validated($request));
        $this->audit($request, 'customer.created', $customer, after: $this->auditPayload($customer));

        return (new CustomerResource($customer))->response()->setStatusCode(201);
    }

    public function show(Customer $customer)
    {
        return new CustomerResource($customer);
    }

    public function update(Request $request, Customer $customer)
    {
        $before = $this->auditPayload($customer);
        $customer->update($this->validated($request, $customer));
        $this->audit($request, 'customer.updated', $customer, $before, $this->auditPayload($customer));

        return new CustomerResource($customer);
    }

    public function destroy(Request $request, Customer $customer)
    {
        $before = $this->auditPayload($customer);
        $customer->update(['is_active' => false]);
        $this->audit($request, 'customer.disabled', $customer, $before, $this->auditPayload($customer));

        return response()->json(['message' => 'Customer dinonaktifkan.']);
    }

    private function validated(Request $request, ?Customer $customer = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:180', Rule::unique('customers', 'name')->ignore($customer?->id)],
            'phone' => ['nullable', 'string', 'max:60'],
            'email' => ['nullable', 'email', 'max:150'],
            'address' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function audit(Request $request, string $action, Customer $customer, ?array $before = null, ?array $after = null): void
    {
        AuditLog::create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'entity' => 'customers',
            'entity_id' => $customer->id,
            'metadata' => array_filter(['before' => $before, 'after' => $after]),
        ]);
    }

    private function auditPayload(Customer $customer): array
    {
        return $customer->only(['name', 'phone', 'email', 'address', 'is_active']);
    }
}
