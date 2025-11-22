<?php

namespace App\Controllers;

use App\Models\TeamMember;
use App\Models\Invitation;
use App\Models\Product;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use Respect\Validation\Validator as v;

class TeamMemberController
{
    private $teamMemberModel;
    private $invitationModel;
    private $productModel;

    public function __construct()
    {
        $this->teamMemberModel = new TeamMember();
        $this->invitationModel = new Invitation();
        $this->productModel = new Product();
    }

    /**
     * 获取产品团队成员列表
     * GET /api/products/{productId}/members
     */
    public function getMembers($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查用户权限
            if (!$this->teamMemberModel->checkUserAccess($productId, $userId)) {
                return Response::error('无权限访问该产品', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;

            $result = $this->teamMemberModel->getProductMembers($productId, $page, $limit);

            if ($result === false) {
                return Response::error('获取团队成员列表失败');
            }

            return Response::success($result, '获取团队成员列表成功');
        } catch (\Exception $e) {
            error_log('Get team members error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 邀请团队成员
     * POST /api/products/{productId}/members/invite
     */
    public function inviteMember($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查管理权限
            if (!$this->teamMemberModel->checkAdminAccess($productId, $userId)) {
                return Response::error('无权限邀请成员', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 验证输入
            $validator = v::key('role', v::in(['admin', 'member', 'viewer']));
            
            if (!$validator->validate($input)) {
                return Response::error('请选择有效的角色', 400);
            }

            $role = $input['role'];
            $expiresInDays = isset($input['expires_in_days']) ? intval($input['expires_in_days']) : 7;
            
            // 限制过期时间范围
            $expiresInDays = max(1, min(30, $expiresInDays));

            // 创建邀请
            $invitation = $this->invitationModel->createInvitation($productId, $role, $userId, $expiresInDays);

            if (!$invitation) {
                return Response::error('创建邀请失败');
            }

            return Response::success([
                'invitation_token' => $invitation['token'],
                'invite_url' => $invitation['invite_url'],
                'role' => $invitation['role'],
                'expires_at' => $invitation['expires_at']
            ], '邀请链接创建成功', 201);
        } catch (\Exception $e) {
            error_log('Invite member error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 更新成员角色
     * PUT /api/products/{productId}/members/{userId}/role
     */
    public function updateMemberRole($productId, $memberId)
    {
        try {
            $currentUserId = AuthMiddleware::getCurrentUserId();
            if (!$currentUserId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($memberId) || $memberId <= 0) {
                return Response::error('无效的ID参数', 400);
            }

            // 检查管理权限
            if (!$this->teamMemberModel->checkAdminAccess($productId, $currentUserId)) {
                return Response::error('无权限修改成员角色', 403);
            }

            // 获取请求数据
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input) {
                return Response::error('无效的请求数据', 400);
            }

            // 验证角色
            $validator = v::key('role', v::in(['admin', 'member', 'viewer']));
            if (!$validator->validate($input)) {
                return Response::error('请选择有效的角色', 400);
            }

            $newRole = $input['role'];

            // 不能修改自己的角色
            if ($memberId == $currentUserId) {
                return Response::error('不能修改自己的角色', 400);
            }

            $result = $this->teamMemberModel->updateMemberRole($productId, $memberId, $newRole, $currentUserId);

            if (!$result) {
                return Response::error('更新成员角色失败');
            }

            return Response::success(null, '成员角色更新成功');
        } catch (\Exception $e) {
            error_log('Update member role error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 移除团队成员
     * DELETE /api/products/{productId}/members/{userId}
     */
    public function removeMember($productId, $memberId)
    {
        try {
            $currentUserId = AuthMiddleware::getCurrentUserId();
            if (!$currentUserId) {
                return Response::error('未授权访问', 401);
            }

            // 验证ID
            if (!is_numeric($productId) || $productId <= 0 || !is_numeric($memberId) || $memberId <= 0) {
                return Response::error('无效的ID参数', 400);
            }

            // 检查管理权限
            if (!$this->teamMemberModel->checkAdminAccess($productId, $currentUserId)) {
                return Response::error('无权限移除成员', 403);
            }

            // 不能移除自己
            if ($memberId == $currentUserId) {
                return Response::error('不能移除自己', 400);
            }

            $result = $this->teamMemberModel->removeMember($productId, $memberId, $currentUserId);

            if (!$result) {
                return Response::error('移除成员失败');
            }

            return Response::success(null, '成员移除成功');
        } catch (\Exception $e) {
            error_log('Remove member error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取邀请信息
     * GET /api/invitations/{token}
     */
    public function getInvitation($token)
    {
        try {
            if (empty($token)) {
                return Response::error('邀请令牌不能为空', 400);
            }

            $invitation = $this->invitationModel->getInvitationByToken($token);

            if (!$invitation) {
                return Response::error('邀请不存在或已过期', 404);
            }

            // 只返回必要信息，不暴露敏感数据
            return Response::success([
                'product_name' => $invitation['product_name'],
                'product_logo' => $invitation['product_logo'],
                'role' => $invitation['role'],
                'invited_by' => $invitation['invited_by_full_name'] ?: $invitation['invited_by_name'],
                'expires_at' => $invitation['expires_at']
            ], '获取邀请信息成功');
        } catch (\Exception $e) {
            error_log('Get invitation error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 接受邀请
     * POST /api/invitations/{token}/accept
     */
    public function acceptInvitation($token)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('请先登录', 401);
            }

            if (empty($token)) {
                return Response::error('邀请令牌不能为空', 400);
            }

            $result = $this->invitationModel->acceptInvitation($token, $userId);

            if (!$result) {
                return Response::error('接受邀请失败');
            }

            return Response::success(null, '成功加入团队');
        } catch (\Exception $e) {
            error_log('Accept invitation error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 拒绝邀请
     * POST /api/invitations/{token}/decline
     */
    public function declineInvitation($token)
    {
        try {
            if (empty($token)) {
                return Response::error('邀请令牌不能为空', 400);
            }

            $result = $this->invitationModel->declineInvitation($token);

            if (!$result) {
                return Response::error('拒绝邀请失败');
            }

            return Response::success(null, '已拒绝邀请');
        } catch (\Exception $e) {
            error_log('Decline invitation error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取产品邀请列表
     * GET /api/products/{productId}/invitations
     */
    public function getInvitations($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查管理权限
            if (!$this->teamMemberModel->checkAdminAccess($productId, $userId)) {
                return Response::error('无权限查看邀请列表', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 10;

            $result = $this->invitationModel->getProductInvitations($productId, $page, $limit);

            if ($result === false) {
                return Response::error('获取邀请列表失败');
            }

            return Response::success($result, '获取邀请列表成功');
        } catch (\Exception $e) {
            error_log('Get invitations error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }

    /**
     * 获取成员操作日志
     * GET /api/products/{productId}/members/logs
     */
    public function getMemberLogs($productId)
    {
        try {
            $userId = AuthMiddleware::getCurrentUserId();
            if (!$userId) {
                return Response::error('未授权访问', 401);
            }

            // 验证产品ID
            if (!is_numeric($productId) || $productId <= 0) {
                return Response::error('无效的产品ID', 400);
            }

            // 检查管理权限
            if (!$this->teamMemberModel->checkAdminAccess($productId, $userId)) {
                return Response::error('无权限查看操作日志', 403);
            }

            // 获取查询参数
            $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
            $limit = isset($_GET['limit']) ? max(1, min(50, intval($_GET['limit']))) : 20;

            $result = $this->teamMemberModel->getMemberLogs($productId, $page, $limit);

            if ($result === false) {
                return Response::error('获取操作日志失败');
            }

            return Response::success($result, '获取操作日志成功');
        } catch (\Exception $e) {
            error_log('Get member logs error: ' . $e->getMessage());
            return Response::error('服务器内部错误');
        }
    }
}