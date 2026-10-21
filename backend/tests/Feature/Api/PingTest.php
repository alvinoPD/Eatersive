<?php

namespace Tests\Feature\Api;

use Tests\TestCase;

class PingTest extends TestCase
{
    public function test_ping_endpoint_returns_expected_json(): void
    {
        $response = $this->getJson('/api/v1/ping');

        $response
            ->assertOk()
            ->assertExactJson([
                'success' => true,
                'message' => 'Pong',
                'data' => [
                    'pong' => true,
                ],
            ]);
    }

    public function test_ping_endpoint_is_registered_with_expected_name(): void
    {
        $this->assertSame(
            url('/api/v1/ping'),
            route('api.v1.ping')
        );
    }
}
