INSERT OR IGNORE INTO users (id, email) VALUES ('user_demo', 'founder@example.cn');
INSERT OR IGNORE INTO workspaces (
  id, user_id, company_name, company_name_en, website_url, company_description,
  main_business, contact_name, email, phone
) VALUES (
  'ws_demo', 'user_demo', '青岛海川制造有限公司', 'Qingdao Haichuan Manufacturing',
  'https://example.cn', '为品牌客户提供箱包与礼赠品 OEM 服务', '箱包、帆布袋、礼赠品',
  '王云杰', 'founder@example.cn', '+86 532 5555 0108'
);
INSERT OR IGNORE INTO credit_balances (workspace_id, trial, subscription, top_up)
VALUES ('ws_demo', 3, 22, 0);
INSERT OR IGNORE INTO products (
  id, workspace_id, name, description, advantages, service_type, product_url, moq, lead_time, confirmed_at
) VALUES (
  'prod_bags', 'ws_demo', '帆布袋与礼赠品', '支持定制帆布袋、收纳包和活动礼赠品',
  'OEM/ODM，小批量起订，日本出口经验', 'OEM/ODM', 'https://example.cn/products', '300 件起', '25-35 天', unixepoch()
);
INSERT OR IGNORE INTO campaigns (
  id, workspace_id, name, campaign_context, region, core_message_ja, cta_ja,
  target_success_count, schedule_days_json, schedule_time_jst, status
) VALUES (
  'cmp_demo', 'ws_demo', '日本品牌联名与礼赠品', '寻找有联名企划、OEM 或促销品需求的日本企业',
  '关东', '弊社はバッグ・ポーチ・ノベルティのOEM/ODM生産を行っております。',
  'ご関心がございましたら、オンラインで簡単にご紹介させていただけますと幸いです。',
  20, '["MON","WED","FRI"]', '09:30', 'RUNNING'
);
INSERT OR IGNORE INTO campaign_products (campaign_id, product_id) VALUES ('cmp_demo', 'prod_bags');
