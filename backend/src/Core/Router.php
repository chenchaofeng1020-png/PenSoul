<?php

namespace App\Core;

use App\Utils\Response;

class Router
{
    private $routes = [];
    private $middlewares = [];

    /**
     * 添加GET路由
     */
    public function get($path, $handler)
    {
        $this->addRoute('GET', $path, $handler);
        return $this;
    }

    /**
     * 添加POST路由
     */
    public function post($path, $handler)
    {
        $this->addRoute('POST', $path, $handler);
        return $this;
    }

    /**
     * 添加PUT路由
     */
    public function put($path, $handler)
    {
        $this->addRoute('PUT', $path, $handler);
        return $this;
    }

    /**
     * 添加DELETE路由
     */
    public function delete($path, $handler)
    {
        $this->addRoute('DELETE', $path, $handler);
        return $this;
    }

    /**
     * 添加路由
     */
    private function addRoute($method, $path, $handler)
    {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler,
            'middlewares' => $this->middlewares
        ];
        $this->middlewares = []; // 重置中间件
    }

    /**
     * 添加中间件
     */
    public function middleware($middleware)
    {
        $this->middlewares[] = $middleware;
        return $this;
    }

    /**
     * 路由分发
     */
    public function dispatch()
    {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        
        // 保持完整路径，不移除API前缀
        
        foreach ($this->routes as $route) {
            if ($this->matchRoute($route, $method, $path)) {
                $this->executeRoute($route, $path);
                return;
            }
        }
        
        Response::error('路由不存在', 404);
    }

    /**
     * 匹配路由
     */
    private function matchRoute($route, $method, $path)
    {
        if ($route['method'] !== $method) {
            return false;
        }
        
        $routePath = $route['path'];
        
        // 将路由路径转换为正则表达式
        $pattern = preg_replace('/\{([^}]+)\}/', '([^/]+)', $routePath);
        $pattern = '/^' . str_replace('/', '\/', $pattern) . '$/';
        
        return preg_match($pattern, $path);
    }

    /**
     * 执行路由
     */
    private function executeRoute($route, $path)
    {
        try {
            // 执行中间件
            foreach ($route['middlewares'] as $middleware) {
                if (is_callable($middleware)) {
                    $middleware();
                } elseif (is_string($middleware) && class_exists($middleware)) {
                    $middlewareInstance = new $middleware();
                    $middlewareInstance->handle();
                }
            }
            
            // 提取路径参数
            $params = $this->extractParams($route['path'], $path);
            
            // 执行处理器
            $handler = $route['handler'];
            if (is_array($handler)) {
                [$controller, $method] = $handler;
                $controllerInstance = new $controller();
                $controllerInstance->$method(...$params);
            } elseif (is_callable($handler)) {
                $handler(...$params);
            }
        } catch (\Exception $e) {
            Response::error($e->getMessage(), 500);
        }
    }

    /**
     * 提取路径参数
     */
    private function extractParams($routePath, $actualPath)
    {
        $routeParts = explode('/', trim($routePath, '/'));
        $actualParts = explode('/', trim($actualPath, '/'));
        $params = [];
        
        for ($i = 0; $i < count($routeParts); $i++) {
            if (preg_match('/\{([^}]+)\}/', $routeParts[$i])) {
                $params[] = $actualParts[$i] ?? null;
            }
        }
        
        return $params;
    }
}