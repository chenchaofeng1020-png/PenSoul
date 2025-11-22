<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class Invitation
{
    private $db;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 创建邀请链接
     */
    public function createInvitation($productId, $role, $invitedBy, $expiresInDays = 7)
    {
        try {
            // 生成唯一token
            $token = $this->generateToken();
            $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days"));
            
            $sql = "
                INSERT INTO member_invitations (product_id, token, role, invited_by, expires_at)
                VALUES (?, ?, ?, ?, ?)
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $token, $role, $invitedBy, $expiresAt]);
            
            return [
                'id' => $this->db->lastInsertId(),
                'token' => $token,
                'role' => $role,
                'expires_at' => $expiresAt,
                'invite_url' => $this->generateInviteUrl($token)
            ];
        } catch (\Exception $e) {
            error_log('Create invitation error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 根据token获取邀请信息
     */
    public function getInvitationByToken($token)
    {
        try {
            $sql = "
                SELECT 
                    mi.*,
                    p.name as product_name,
                    p.logo as product_logo,
                    u.username as invited_by_name,
                    u.full_name as invited_by_full_name
                FROM member_invitations mi
                INNER JOIN products p ON mi.product_id = p.id
                INNER JOIN users u ON mi.invited_by = u.id
                WHERE mi.token = ? AND mi.status = 'pending'
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$token]);
            $invitation = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$invitation) {
                return null;
            }
            
            // 检查是否过期
            if (strtotime($invitation['expires_at']) < time()) {
                $this->updateInvitationStatus($invitation['id'], 'expired');
                return null;
            }
            
            return $invitation;
        } catch (\Exception $e) {
            error_log('Get invitation error: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * 接受邀请
     */
    public function acceptInvitation($token, $userId)
    {
        try {
            $this->db->beginTransaction();
            
            // 获取邀请信息
            $invitation = $this->getInvitationByToken($token);
            if (!$invitation) {
                throw new \Exception('邀请不存在或已过期');
            }
            
            // 检查用户是否已经是团队成员
            $checkSql = "SELECT id FROM user_products WHERE user_id = ? AND product_id = ?";
            $checkStmt = $this->db->prepare($checkSql);
            $checkStmt->execute([$userId, $invitation['product_id']]);
            
            if ($checkStmt->fetch()) {
                throw new \Exception('用户已经是该产品的团队成员');
            }
            
            // 添加用户到产品团队
            $addMemberSql = "
                INSERT INTO user_products (user_id, product_id, role, created_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ";
            $addMemberStmt = $this->db->prepare($addMemberSql);
            $addMemberStmt->execute([$userId, $invitation['product_id'], $invitation['role']]);
            
            // 更新邀请状态
            $updateSql = "
                UPDATE member_invitations 
                SET status = 'accepted', used_at = CURRENT_TIMESTAMP, used_by = ?
                WHERE id = ?
            ";
            $updateStmt = $this->db->prepare($updateSql);
            $updateStmt->execute([$userId, $invitation['id']]);
            
            // 记录日志
            $this->logMemberAction(
                $invitation['product_id'], 
                $userId, 
                'joined', 
                null, 
                $invitation['role'], 
                $invitation['invited_by']
            );
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log('Accept invitation error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 拒绝邀请
     */
    public function declineInvitation($token)
    {
        try {
            $invitation = $this->getInvitationByToken($token);
            if (!$invitation) {
                return false;
            }
            
            return $this->updateInvitationStatus($invitation['id'], 'declined');
        } catch (\Exception $e) {
            error_log('Decline invitation error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 获取产品的邀请列表
     */
    public function getProductInvitations($productId, $page = 1, $limit = 10)
    {
        try {
            $offset = ($page - 1) * $limit;
            
            $sql = "
                SELECT 
                    mi.*,
                    u.username as invited_by_name,
                    u.full_name as invited_by_full_name,
                    ub.username as used_by_name,
                    ub.full_name as used_by_full_name
                FROM member_invitations mi
                INNER JOIN users u ON mi.invited_by = u.id
                LEFT JOIN users ub ON mi.used_by = ub.id
                WHERE mi.product_id = ?
                ORDER BY mi.created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $limit, $offset]);
            $invitations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 获取总数
            $countSql = "SELECT COUNT(*) as total FROM member_invitations WHERE product_id = ?";
            $countStmt = $this->db->prepare($countSql);
            $countStmt->execute([$productId]);
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            return [
                'invitations' => $invitations,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => (int)$total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (\Exception $e) {
            error_log('Get product invitations error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 更新邀请状态
     */
    private function updateInvitationStatus($invitationId, $status)
    {
        try {
            $sql = "UPDATE member_invitations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute([$status, $invitationId]);
        } catch (\Exception $e) {
            error_log('Update invitation status error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 生成邀请token
     */
    private function generateToken()
    {
        return hash('sha256', uniqid() . time() . rand());
    }

    /**
     * 生成邀请URL
     */
    private function generateInviteUrl($token)
    {
        $baseUrl = $_ENV['APP_URL'] ?? 'http://localhost:5173';
        return $baseUrl . '/invite/' . $token;
    }

    /**
     * 记录成员操作日志
     */
    private function logMemberAction($productId, $userId, $action, $oldRole = null, $newRole = null, $operatedBy = null)
    {
        try {
            $sql = "
                INSERT INTO team_member_logs (product_id, user_id, action, old_role, new_role, operated_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $userId, $action, $oldRole, $newRole, $operatedBy]);
        } catch (\Exception $e) {
            error_log('Log member action error: ' . $e->getMessage());
        }
    }

    /**
     * 清理过期邀请
     */
    public function cleanupExpiredInvitations()
    {
        try {
            $sql = "
                UPDATE member_invitations 
                SET status = 'expired', updated_at = CURRENT_TIMESTAMP
                WHERE expires_at < CURRENT_TIMESTAMP AND status = 'pending'
            ";
            $stmt = $this->db->prepare($sql);
            return $stmt->execute();
        } catch (\Exception $e) {
            error_log('Cleanup expired invitations error: ' . $e->getMessage());
            return false;
        }
    }
}