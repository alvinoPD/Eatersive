<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_returns_expected_json(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'message' => 'Laravel API is running',
                'data' => [
                    'status' => 'ok',
                ],
            ]);
    }

    public function test_health_endpoint_allows_configured_frontend_origin(): void
    {
        $response = $this->getJson('/api/v1/health', [
            'Origin' => 'http://localhost:5173',
        ]);

        $response->assertOk();
        $this->assertSame(
            'http://localhost:5173',
            $response->headers->get('Access-Control-Allow-Origin')
        );
    }

    public function test_health_endpoint_rejects_unknown_origin(): void
    {
        $response = $this->getJson('/api/v1/health', [
            'Origin' => 'http://evil.example.com',
        ]);

        $response->assertOk();
        $this->assertNull($response->headers->get('Access-Control-Allow-Origin'));
    }
}
