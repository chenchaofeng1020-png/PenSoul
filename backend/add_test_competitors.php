<?php

// 数据库连接
try {
    $pdo = new PDO(
        "sqlite:" . __DIR__ . "/database/product_duck.sqlite",
        null,
        null,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "数据库连接成功\n";
} catch (PDOException $e) {
    die("数据库连接失败: " . $e->getMessage());
}

// 查找testauth用户的产品
$stmt = $pdo->prepare("SELECT * FROM products WHERE user_id = (SELECT id FROM users WHERE username = 'testauth')");
$stmt->execute();
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$product) {
    die("未找到testauth用户的产品\n");
}

echo "找到产品: {$product['name']} (ID: {$product['id']})\n";

// 添加测试竞品数据
$testCompetitors = [
    [
        'name' => 'Notion',
        'slogan' => '一个工作空间，无限可能',
        'description' => 'Notion是一个集笔记、知识库、数据库、看板、日历等功能于一体的生产力工具。它提供了灵活的模块化编辑器，让用户可以创建自定义的工作空间。',
        'website_url' => 'https://www.notion.so',
        'documentation_url' => 'https://www.notion.so/help',

        'logo_url' => 'https://www.notion.so/images/logo-ios.png',
        'main_customers' => 'Spotify,Pixar,Nike,Headspace,Buffer'
    ],
    [
        'name' => 'Airtable',
        'slogan' => '构建下一代应用程序的平台',
        'description' => 'Airtable是一个低代码平台，结合了电子表格的简单性和数据库的强大功能。它让团队能够轻松创建应用程序来管理工作流程、跟踪项目和协作。',
        'website_url' => 'https://airtable.com',
        'documentation_url' => 'https://support.airtable.com',

        'logo_url' => 'https://static.airtable.com/images/favicon/favicon-32x32.png',
        'main_customers' => 'Netflix,Expedia,BuzzFeed,Medium,WeWork'
    ],
    [
        'name' => 'Monday.com',
        'slogan' => '让团队协作变得简单',
        'description' => 'Monday.com是一个工作操作系统，让团队能够运行项目和工作流程。它提供了可视化的项目管理工具，帮助团队保持同步和高效协作。',
        'website_url' => 'https://monday.com',
        'documentation_url' => 'https://support.monday.com',

        'logo_url' => 'https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/img/monday-logo-x2.png',
        'main_customers' => 'Coca-Cola,Adobe,Universal Music,Canva,Lionsgate'
    ],
    [
        'name' => 'Trello',
        'slogan' => '协作项目管理',
        'description' => 'Trello使用看板、列表和卡片的方式来帮助团队组织和优先处理项目。它是一个简单而强大的协作工具，适合各种规模的团队。',
        'website_url' => 'https://trello.com',
        'documentation_url' => 'https://help.trello.com',

        'logo_url' => 'https://a.trellocdn.com/prgb/dist/images/ios/apple-touch-icon-152x152-precomposed.png',
        'main_customers' => 'Google,Zoom,Grand Hyatt,Fender,Costco'
    ]
];

$productId = $product['id'];
$currentTime = date('Y-m-d H:i:s');

foreach ($testCompetitors as $competitor) {
    // 检查是否已存在同名竞品
    $checkStmt = $pdo->prepare("SELECT id FROM competitors WHERE product_id = ? AND name = ?");
    $checkStmt->execute([$productId, $competitor['name']]);
    
    if ($checkStmt->fetch()) {
        echo "竞品 {$competitor['name']} 已存在，跳过\n";
        continue;
    }
    
    // 插入竞品数据
    $insertStmt = $pdo->prepare("
        INSERT INTO competitors (
            product_id, name, slogan, description, website_url, 
            documentation_url, logo_url, main_customers,
            status, is_deleted, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?
        )
    ");
    
    $insertStmt->execute([
        $productId,
        $competitor['name'],
        $competitor['slogan'],
        $competitor['description'],
        $competitor['website_url'],
        $competitor['documentation_url'],
        $competitor['logo_url'],
        $competitor['main_customers'],
        $currentTime,
        $currentTime
    ]);
    
    echo "添加竞品: {$competitor['name']}\n";
}

echo "\n测试竞品数据添加完成！\n";

// 验证添加结果
$stmt = $pdo->prepare("SELECT COUNT(*) as count FROM competitors WHERE product_id = ?");
$stmt->execute([$productId]);
$result = $stmt->fetch(PDO::FETCH_ASSOC);
echo "产品 {$product['name']} 现在有 {$result['count']} 个竞品\n";

?>