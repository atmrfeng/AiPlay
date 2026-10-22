<script setup lang="ts">
// 全局确认框宿主，挂在 App 根部
import { confirmState, resolveConfirm } from '../utils/confirm'
</script>

<template>
  <div v-if="confirmState.open" class="sheet-mask" @click.self="resolveConfirm(false)">
    <div class="confirm-card pop-in">
      <div class="cf-title">{{ confirmState.title }}</div>
      <div v-if="confirmState.text" class="cf-text">{{ confirmState.text }}</div>
      <div class="cf-actions">
        <button class="btn btn-ghost" @click="resolveConfirm(false)">{{ confirmState.cancelText }}</button>
        <button class="btn" :class="confirmState.danger ? 'btn-danger' : 'btn-primary'" @click="resolveConfirm(true)">
          {{ confirmState.okText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-card {
  width: 100%;
  max-width: 320px;
  background: #fff;
  border-radius: 24px;
  padding: 22px 20px 16px;
  text-align: center;
  box-shadow: 0 24px 60px rgba(160, 60, 90, 0.24);
}
.cf-title {
  font-size: 16px;
  font-weight: 900;
  color: #4a2f38;
}
.cf-text {
  margin-top: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: #9b7f8a;
}
.cf-actions {
  display: flex;
  gap: 10px;
  margin-top: 18px;
}
.cf-actions .btn {
  flex: 1;
  height: 44px;
  font-size: 14px;
}
.btn-danger {
  background: linear-gradient(120deg, #ff8a8a, #e8384f);
  color: #fff;
  box-shadow: 0 8px 20px rgba(232, 56, 79, 0.28);
}
</style>
