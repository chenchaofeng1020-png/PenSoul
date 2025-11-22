<?php

namespace App\Models;

use App\Config\Database;
use PDO;

class TeamMember
{
    private $db;

    public function __construct()
    {
        $database = new Database();
        $this->db = $database->getConnection();
    }

    /**
     * 获取产品的团队成员列表
     */
    public function getProductMembers($productId, $page = 1, $limit = 10)
    {
        try {
            $offset = ($page - 1) * $limit;
            
            // 获取成员列表
            $sql = "
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.full_name,
                    u.avatar,
                    up.role,
                    up.created_at as joined_at
                FROM users u
                INNER JOIN user_products up ON u.id = up.user_id
                WHERE up.product_id = ?
                ORDER BY 
                    CASE up.role 
                        WHEN 'owner' THEN 1 
                        WHEN 'admin' THEN 2 
                        WHEN 'member' THEN 3 
                        WHEN 'viewer' THEN 4 
                    END,
                    up.created_at ASC
                LIMIT ? OFFSET ?
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $limit, $offset]);
            $members = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 获取总数
            $countSql = "
                SELECT COUNT(*) as total
                FROM user_products up
                WHERE up.product_id = ?
            ";
            $countStmt = $this->db->prepare($countSql);
            $countStmt->execute([$productId]);
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            return [
                'members' => $members,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => (int)$total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (\Exception $e) {
            error_log('Get product members error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查用户是否有产品访问权限
     */
    public function checkUserAccess($productId, $userId)
    {
        try {
            $sql = "SELECT role FROM user_products WHERE product_id = ? AND user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $userId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (\Exception $e) {
            error_log('Check user access error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 检查用户是否有管理权限（owner或admin）
     */
    public function checkAdminAccess($productId, $userId)
    {
        try {
            $access = $this->checkUserAccess($productId, $userId);
            return $access && in_array($access['role'], ['owner', 'admin']);
        } catch (\Exception $e) {
            error_log('Check admin access error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 更新成员角色
     */
    public function updateMemberRole($productId, $userId, $newRole, $operatedBy)
    {
        try {
            $this->db->beginTransaction();
            
            // 获取原角色
            $oldRoleData = $this->checkUserAccess($productId, $userId);
            if (!$oldRoleData) {
                throw new \Exception('用户不是该产品的成员');
            }
            $oldRole = $oldRoleData['role'];
            
            // 不能修改owner角色
            if ($oldRole === 'owner') {
                throw new \Exception('不能修改产品所有者的角色');
            }
            
            // 更新角色
            $sql = "UPDATE user_products SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$newRole, $productId, $userId]);
            
            // 记录日志
            $this->logMemberAction($productId, $userId, 'role_changed', $oldRole, $newRole, $operatedBy);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log('Update member role error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 移除团队成员
     */
    public function removeMember($productId, $userId, $operatedBy)
    {
        try {
            $this->db->beginTransaction();
            
            // 检查是否为owner
            $access = $this->checkUserAccess($productId, $userId);
            if (!$access) {
                throw new \Exception('用户不是该产品的成员');
            }
            
            if ($access['role'] === 'owner') {
                throw new \Exception('不能移除产品所有者');
            }
            
            // 移除成员
            $sql = "DELETE FROM user_products WHERE product_id = ? AND user_id = ?";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $userId]);
            
            // 记录日志
            $this->logMemberAction($productId, $userId, 'removed', $access['role'], null, $operatedBy);
            
            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollBack();
            error_log('Remove member error: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * 记录成员操作日志
     */
    private function logMemberAction($productId, $userId, $action, $oldRole = null, $newRole = null, $operatedBy = null, $details = null)
    {
        try {
            $sql = "
                INSERT INTO team_member_logs (product_id, user_id, action, old_role, new_role, operated_by, details)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ";
            $stmt = $this->db->prepare($sql);
            $stmt->execute([
                $productId,
                $userId,
                $action,
                $oldRole,
                $newRole,
                $operatedBy,
                $details ? json_encode($details) : null
            ]);
        } catch (\Exception $e) {
            error_log('Log member action error: ' . $e->getMessage());
        }
    }

    /**
     * 获取成员操作日志
     */
    public function getMemberLogs($productId, $page = 1, $limit = 20)
    {
        try {
            $offset = ($page - 1) * $limit;
            
            $sql = "
                SELECT 
                    tml.*,
                    u.username as user_name,
                    u.full_name as user_full_name,
                    op.username as operator_name,
                    op.full_name as operator_full_name
                FROM team_member_logs tml
                LEFT JOIN users u ON tml.user_id = u.id
                LEFT JOIN users op ON tml.operated_by = op.id
                WHERE tml.product_id = ?
                ORDER BY tml.created_at DESC
                LIMIT ? OFFSET ?
            ";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute([$productId, $limit, $offset]);
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // 获取总数
            $countSql = "SELECT COUNT(*) as total FROM team_member_logs WHERE product_id = ?";
            $countStmt = $this->db->prepare($countSql);
            $countStmt->execute([$productId]);
            $total = $countStmt->fetch(PDO::FETCH_ASSOC)['total'];
            
            return [
                'logs' => $logs,
                'pagination' => [
                    'current_page' => $page,
                    'per_page' => $limit,
                    'total' => (int)$total,
                    'total_pages' => ceil($total / $limit)
                ]
            ];
        } catch (\Exception $e) {
            error_log('Get member logs error: ' . $e->getMessage());
            return false;
        }
    }
}