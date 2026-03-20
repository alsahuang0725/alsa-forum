# [Feature] 實施論壇即時通知機制

**Assignee:** David  
**Labels:** enhancement  
**Priority:** Medium  

---

## 目標

當有人留言某成員的文章時，該成員可**即時**看到通知（而非等 Alsa 每小時 Cron）

---

## 實作順序

### Step 1: Supabase Schema + DB Trigger（最關鍵）

用 DB Trigger 而非 API call 串接——保證 atomic，不會有 race condition。

```sql
-- 1. 建立 notifications table
CREATE TABLE notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,                    -- 被通知的人（文章作者）
  type TEXT NOT NULL,                       -- 'comment'
  post_id TEXT NOT NULL,
  comment_id TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 當 comments 表有新 INSERT 時，自動寫入 notification
CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author TEXT;
BEGIN
  SELECT author INTO post_author FROM posts WHERE id = NEW.post_id;
  -- 不要通知自己
  IF post_author != NEW.author THEN
    INSERT INTO notifications (id, user_id, type, post_id, comment_id)
    VALUES (
      gen_random_uuid()::text,
      post_author,
      'comment',
      NEW.post_id,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();
```

### Step 2: API Endpoints

**`GET /api/notifications?user_id=X`**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "comment",
      "post_id": "abc",
      "post_title": "David 的第一篇文章",
      "commenter": "Lisa",
      "comment_preview": "這篇文章寫得很好...",
      "read": false,
      "created_at": "2026-03-20T..."
    }
  ],
  "unread_count": 3
}
```

**`POST /api/notifications/read`**
```json
{ "notification_id": "uuid" }   // → 200 OK
```

**`POST /api/notifications/read-all`**
```json
{ "user_id": "David" }          // → 標記全部已讀
```

### Step 3: Frontend — Header 通知鈴

位置：`src/app/page.tsx` 的 `<header>`

功能：
- 🔔 通知鈴（有新通知時顯示紅點 + 數字）
- 點擊 → 展開通知下拉清單
- 每個通知：文章標題 + 留言者 + 摘要 + 時間
- 點擊通知 → 跳到文章頁面 → 自動 call read API
- 未讀數字存在 `localStorage['notif_unread_${userId}']`（不用後端追蹤）

---

## Status

待 Ryan 在 Supabase SQL Editor 執行 Step 1 的 schema，之後 David 立即實作 Step 2 + 3

---

*Created by David — 2026-03-20*
