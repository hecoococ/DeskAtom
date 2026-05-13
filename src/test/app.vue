<template>
  <div class="container">
    <h1>Manual FLIP Demo</h1>

    <div class="actions">
      <button @click="addBatch">添加数据</button>
      <button @click="removeUndone">清理未完成（飞出+补位）</button>
    </div>

    <ul class="list" ref="listRef">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="item"
        :data-id="task.id"
        :class="{ done: task.done, undone: !task.done }"
      >
        {{ task.text }}
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, nextTick } from "vue";

let id = 0;
const tasks = ref([]);
const listRef = ref(null);

const addBatch = () => {
  for (let i = 1; i <= 5; i++) {
    tasks.value.push({ id: id++, text: `未完成 ${i}`, done: false });
    tasks.value.push({ id: id++, text: `已完成 ${i}`, done: true });
  }
};

const removeUndone = async () => {
  const container = listRef.value;
  const elements = [...container.children];

  // 1️⃣ First: 记录初始位置
  const firstMap = new Map();
  elements.forEach((el) => {
    firstMap.set(el.dataset.id, el.getBoundingClientRect());
  });

  // 2️⃣ 找出要删除的元素（未完成）
  const leaving = elements.filter((el) =>
    el.classList.contains("undone")
  );

  // 3️⃣ 克隆用于飞出
  const clones = leaving.map((el) => {
    const rect = el.getBoundingClientRect();
    const clone = el.cloneNode(true);

    Object.assign(clone.style, {
      position: "fixed",
      left: rect.left + "px",
      top: rect.top + "px",
      width: rect.width + "px",
      margin: 0,
      zIndex: 999,
    });

    document.body.appendChild(clone);
    return clone;
  });

  // 4️⃣ 修改数据（删除未完成）
  tasks.value = tasks.value.filter((t) => t.done);

  await nextTick();

  const newElements = [...container.children];

  // 5️⃣ Last + FLIP（补位动画）
  newElements.forEach((el) => {
    const id = el.dataset.id;
    const first = firstMap.get(id);
    const last = el.getBoundingClientRect();

    if (!first) return;

    const dx = first.left - last.left;
    const dy = first.top - last.top;

    // Invert
    el.style.transform = `translate(${dx}px, ${dy}px)`;

    // 强制重排
    el.offsetHeight;

    // Play
    el.style.transition = "transform 0.5s ease";
    el.style.transform = "";
  });

  // 6️⃣ 飞出动画
  clones.forEach((clone) => {
    requestAnimationFrame(() => {
      clone.style.transition = "all 0.5s ease";
      clone.style.transform = "translateX(300px)";
      clone.style.opacity = "0";
    });
  });

  // 7️⃣ 清理 clone
  setTimeout(() => {
    clones.forEach((c) => c.remove());
  }, 500);
};
</script>

<style scoped>
.container {
  width: 420px;
  margin: 40px auto;
  font-family: sans-serif;
}

.actions {
  margin-bottom: 12px;
  display: flex;
  gap: 10px;
}

.list {
  list-style: none;
  padding: 0;
}

.item {
  background: #f3f3f3;
  margin: 6px 0;
  padding: 12px;
  border-radius: 8px;
  will-change: transform;
}

.done {
  color: green;
}

.undone {
  color: red;
}
</style>