<?php
// 创建团队成员管理相关数据库表

try {
    $pdo = new PDO('sqlite:database/product_duck.sqlite');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "Creating team member management tables...\n";
    
    // 成员邀请表
    $createInvitationsTable = "
    CREATE TABLE IF NOT EXISTS member_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        role TEXT CHECK (role IN ('admin', 'member', 'viewer')) NOT NULL DEFAULT 'member',
        invited_by INTEGER NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        used_by INTEGER NULL,
        status TEXT CHECK (status IN ('pending', 'accepted', 'declined', 'expired')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (used_by) REFERENCES users(id) ON DELETE SET NULL
    )";
    
    $pdo->exec($createInvitationsTable);
    echo "✓ Created member_invitations table\n";
    
    // 创建索引
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_invitations_token ON member_invitations(token)",
        "CREATE INDEX IF NOT EXISTS idx_invitations_product_id ON member_invitations(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON member_invitations(invited_by)",
        "CREATE INDEX IF NOT EXISTS idx_invitations_status ON member_invitations(status)",
        "CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON member_invitations(expires_at)"
    ];
    
    foreach ($indexes as $index) {
        $pdo->exec($index);
    }
    echo "✓ Created indexes for member_invitations\n";
    
    // 为user_products表添加复合索引
    $userProductIndexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_products_product_user ON user_products(product_id, user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_products_user_product ON user_products(user_id, product_id)"
    ];
    
    foreach ($userProductIndexes as $index) {
        $pdo->exec($index);
    }
    echo "✓ Created indexes for user_products\n";
    
    // 团队成员活动日志表
    $createLogsTable = "
    CREATE TABLE IF NOT EXISTS team_member_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        action TEXT CHECK (action IN ('invited', 'joined', 'role_changed', 'removed', 'left')) NOT NULL,
        old_role TEXT CHECK (old_role IN ('owner', 'admin', 'member', 'viewer')) NULL,
        new_role TEXT CHECK (new_role IN ('owner', 'admin', 'member', 'viewer')) NULL,
        operated_by INTEGER NOT NULL,
        details TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (operated_by) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    $pdo->exec($createLogsTable);
    echo "✓ Created team_member_logs table\n";
    
    // 创建日志表索引
    $logIndexes = [
        "CREATE INDEX IF NOT EXISTS idx_logs_product_id ON team_member_logs(product_id)",
        "CREATE INDEX IF NOT EXISTS idx_logs_user_id ON team_member_logs(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_logs_action ON team_member_logs(action)",
        "CREATE INDEX IF NOT EXISTS idx_logs_created_at ON team_member_logs(created_at)"
    ];
    
    foreach ($logIndexes as $index) {
        $pdo->exec($index);
    }
    echo "✓ Created indexes for team_member_logs\n";
    
    // 插入测试邀请数据
    $testToken = hash('sha256', 'test_invitation_' . time() . rand());
    $expiresAt = date('Y-m-d H:i:s', strtotime('+7 days'));
    
    $insertTest = "
    INSERT INTO member_invitations (product_id, token, role, invited_by, expires_at) 
    VALUES (1, ?, 'member', 1, ?)
    ";
    
    $stmt = $pdo->prepare($insertTest);
    $stmt->execute([$testToken, $expiresAt]);
    echo "✓ Inserted test invitation data\n";
    
    echo "\n🎉 All team member management tables created successfully!\n";
    echo "Test invitation token: $testToken\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}
?>