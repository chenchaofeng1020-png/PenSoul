<?php

namespace App\Utils;

use Exception;

class JWT
{
    private static $secret;
    private static $expire;
    private static $algorithm = 'HS256';

    public static function init()
    {
        self::$secret = $_ENV['JWT_SECRET'] ?? 'default-secret-key';
        self::$expire = (int)($_ENV['JWT_EXPIRE'] ?? 3600);
    }

    /**
     * 生成JWT token
     */
    public static function generate($payload)
    {
        if (!self::$secret) {
            self::init();
        }

        $header = [
            'typ' => 'JWT',
            'alg' => self::$algorithm
        ];

        $now = time();
        $token_payload = [
            'iss' => 'product-duck',
            'iat' => $now,
            'exp' => $now + self::$expire,
            'data' => $payload
        ];

        $headerEncoded = self::base64UrlEncode(json_encode($header));
        $payloadEncoded = self::base64UrlEncode(json_encode($token_payload));
        
        $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, self::$secret, true);
        $signatureEncoded = self::base64UrlEncode($signature);

        return $headerEncoded . '.' . $payloadEncoded . '.' . $signatureEncoded;
    }

    /**
     * 验证JWT token
     */
    public static function verify($token)
    {
        if (!self::$secret) {
            self::init();
        }

        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                throw new Exception('Invalid token format');
            }

            list($headerEncoded, $payloadEncoded, $signatureEncoded) = $parts;
            
            $signature = hash_hmac('sha256', $headerEncoded . '.' . $payloadEncoded, self::$secret, true);
            $expectedSignature = self::base64UrlEncode($signature);
            
            if (!hash_equals($expectedSignature, $signatureEncoded)) {
                throw new Exception('Invalid signature');
            }
            
            $payload = json_decode(self::base64UrlDecode($payloadEncoded), true);
            
            if ($payload['exp'] < time()) {
                throw new Exception('Token expired');
            }
            
            return $payload['data'];
        } catch (Exception $e) {
            throw new Exception('Token验证失败: ' . $e->getMessage());
        }
    }

    /**
     * 刷新JWT token
     */
    public static function refresh($token)
    {
        $payload = self::verify($token);
        return self::generate($payload);
    }

    /**
     * Base64 URL编码
     */
    private static function base64UrlEncode($data)
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Base64 URL解码
     */
    private static function base64UrlDecode($data)
    {
        return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
    }

    /**
     * 从请求头获取token
     */
    public static function getTokenFromHeader()
    {
        // 兼容CLI环境
        if (function_exists('getallheaders')) {
            $headers = getallheaders();
        } else {
            // CLI环境下从$_SERVER获取
            $headers = [];
            foreach ($_SERVER as $key => $value) {
                if (strpos($key, 'HTTP_') === 0) {
                    $header = str_replace('_', '-', substr($key, 5));
                    $headers[$header] = $value;
                }
            }
        }
        
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? $headers['AUTHORIZATION'] ?? '';
        
        if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }

    /**
     * 验证请求中的token并返回用户信息
     */
    public static function validateRequest()
    {
        $token = self::getTokenFromHeader();
        
        if (!$token) {
            throw new Exception('缺少认证token');
        }
        
        return self::verify($token);
    }
}