// 数据库诊断脚本
// 运行: node --experimental-modules diagnose-db.js

async function diagnose() {
  console.log('🔍 开始诊断数据库问题...\n');
  
  const apiBase = process.env.API_URL || 'http://localhost:8788/api';
  
  try {
    // 1. 检查数据库状态
    console.log('1️⃣ 检查数据库状态...');
    const statusRes = await fetch(`${apiBase}/database/status`);
    const status = await statusRes.json();
    
    if (statusRes.ok) {
      console.log('✅ 数据库连接正常');
      console.log(`   当前版本: ${status.currentVersion}`);
      console.log(`   最新版本: ${status.latestVersion}`);
      console.log(`   表数量: ${status.tableCount}`);
      console.log(`   状态: ${status.status}`);
      
      if (status.needsUpdate) {
        console.log('\n⚠️  数据库需要更新！');
        console.log('   请运行迁移来创建缺失的表。');
      }
    } else {
      console.log('❌ 数据库状态检查失败:', status.error);
    }
    
    // 2. 检查表列表
    console.log('\n2️⃣ 检查数据库表...');
    const tablesRes = await fetch(`${apiBase}/database/tables`);
    const tablesData = await tablesRes.json();
    
    if (tablesRes.ok) {
      console.log(`✅ 找到 ${tablesData.tables.length} 个表:`);
      tablesData.tables.forEach(table => {
        console.log(`   - ${table.name} (${table.row_count} 行) - ${table.description}`);
      });
      
      // 检查关键表
      const requiredTables = ['config', 'api_platforms', 'api_models', 'users', 'roles'];
      const existingTables = tablesData.tables.map(t => t.name);
      const missingTables = requiredTables.filter(t => !existingTables.includes(t));
      
      if (missingTables.length > 0) {
        console.log('\n⚠️  缺失关键表:');
        missingTables.forEach(table => {
          console.log(`   - ${table}`);
        });
        console.log('\n   这些表是系统正常运行所必需的！');
      } else {
        console.log('\n✅ 所有关键表都存在');
      }
    } else {
      console.log('❌ 获取表列表失败:', tablesData.error);
    }
    
    // 3. 检查迁移历史
    console.log('\n3️⃣ 检查迁移历史...');
    const migrationsRes = await fetch(`${apiBase}/database/migrations`);
    const migrationsData = await migrationsRes.json();
    
    if (migrationsRes.ok) {
      if (migrationsData.migrations.length > 0) {
        console.log(`✅ 已执行 ${migrationsData.migrations.length} 个迁移:`);
        migrationsData.migrations.forEach(m => {
          console.log(`   v${m.version}: ${m.name} (${m.executed_at})`);
        });
      } else {
        console.log('⚠️  没有执行过任何迁移');
      }
    } else {
      console.log('❌ 获取迁移历史失败:', migrationsData.error);
    }
    
    // 4. 提供修复建议
    console.log('\n📋 修复建议:');
    if (status.needsUpdate || (tablesData.tables && tablesData.tables.length < 10)) {
      console.log('   1. 运行数据库迁移:');
      console.log('      curl -X POST ' + apiBase + '/database/migrate');
      console.log('   或者在管理后台的"数据库管理"页面点击"执行迁移"按钮');
      console.log('\n   2. 如果迁移失败，可以尝试重置数据库:');
      console.log('      curl -X POST ' + apiBase + '/database/reset');
      console.log('      然后再执行迁移');
    } else {
      console.log('   ✅ 数据库看起来正常，如果仍有问题，请检查:');
      console.log('      - Cloudflare Pages 的环境变量配置');
      console.log('      - D1 数据库绑定是否正确');
      console.log('      - 浏览器控制台的错误信息');
    }
    
  } catch (error) {
    console.error('\n❌ 诊断过程出错:', error.message);
    console.log('\n请确保:');
    console.log('   1. 开发服务器正在运行 (npm run dev)');
    console.log('   2. API_URL 环境变量设置正确');
    console.log('   3. 网络连接正常');
  }
}

diagnose();
