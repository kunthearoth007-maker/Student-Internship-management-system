<?php

namespace App\Support;

use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;

trait ApiResponse
{
    protected function ok(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        $meta = null;

        if ($data instanceof AnonymousResourceCollection) {
            $inner = $data->resource;
            $items = $data->resolve(request());
            $items = is_array($items) ? $items : $items->all();

            if ($inner instanceof AbstractPaginator) {
                $meta = [
                    'current_page' => $inner->currentPage(),
                    'last_page' => $inner->lastPage(),
                    'per_page' => $inner->perPage(),
                    'total' => $inner->total(),
                ];
            }

            $data = $items;
        } elseif ($data instanceof JsonResource) {
            $data = $data->resolve(request());
        }

        $body = ['success' => true, 'message' => $message, 'data' => $data];

        if ($meta !== null) {
            $body['meta'] = $meta;
        }

        return response()->json($body, $status);
    }

    protected function fail(string $message, int $status = 422, array $errors = []): JsonResponse
    {
        $body = ['success' => false, 'message' => $message];

        if ($errors !== []) {
            $body['errors'] = $errors;
        }

        return response()->json($body, $status);
    }
}
