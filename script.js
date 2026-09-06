/* =========================================================
   Poomjai — script.js
   ใช้ร่วมกันทุกหน้า: product.html / order.html / admin.html
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     0. ค่าคงที่ที่ต้องแก้ก่อนใช้งานจริง
     --------------------------------------------------------- */
  var APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyJLa2AcHQmXK6ShCaP0dp655mbTiVxLlNcW0T29le2hk6z70P4Oa1uyCWbj_O1qqe4/exec';
  var CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRmloDvKqvBZJVVTh443MnlD8ryz_3O6nP66x2qGy3ZdICc49po7oowtQOjlw7ii6I4yDcWyOX2fTrF/pub?gid=0&single=true&output=csv';
  var PRODUCTS_JSON_PATH = 'products.json';

  var MOOD_LABELS = {
    all: 'ทั้งหมด',
    fresh: 'Fresh',
    relax: 'Relax',
    focus: 'Focus',
    romance: 'Romance'
  };

  var MOOD_ORDER = ['all', 'fresh', 'relax', 'focus', 'romance'];

  /* ---------------------------------------------------------
     1. Utilities
     --------------------------------------------------------- */
  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function formatPrice(price) {
    var n = Number(price);
    if (isNaN(n)) return price;
    return n.toLocaleString('th-TH');
  }

  function getParam(name) {
    var params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /* ===========================================================
     2. product.html — โหลดสินค้า, แสดงการ์ด, กรองตาม mood
     =========================================================== */
  function initProductPage() {
    var filterBar = qs('#filter-bar');
    var productList = qs('#product-list');
    if (!filterBar || !productList) return; // ไม่ใช่หน้านี้ ข้ามไป

    var allProducts = [];
    var currentMood = getParam('mood') || 'all';

    fetch(PRODUCTS_JSON_PATH)
      .then(function (res) {
        if (!res.ok) throw new Error('โหลด products.json ไม่สำเร็จ');
        return res.json();
      })
      .then(function (data) {
        allProducts = Array.isArray(data) ? data : [];
        renderFilterBar(filterBar, currentMood);
        renderProductList(productList, filterProducts(allProducts, currentMood));
      })
      .catch(function (error) {
        console.error(error);
        productList.innerHTML = '<p class="text-small">ไม่สามารถโหลดสินค้าได้ในขณะนี้</p>';
      });

    function filterProducts(products, mood) {
      if (!mood || mood === 'all') return products;
      return products.filter(function (p) {
        return p.mood === mood;
      });
    }

    function renderFilterBar(container, activeMood) {
      container.innerHTML = '';
      MOOD_ORDER.forEach(function (mood) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn' + (mood === activeMood ? ' is-active' : '');
        btn.dataset.mood = mood;
        btn.textContent = MOOD_LABELS[mood];
        btn.addEventListener('click', function () {
          currentMood = mood;
          setActiveButton(container, mood);
          renderProductList(productList, filterProducts(allProducts, mood));
        });
        container.appendChild(btn);
      });
    }

    function setActiveButton(container, mood) {
      var buttons = container.querySelectorAll('.filter-btn');
      buttons.forEach(function (btn) {
        btn.classList.toggle('is-active', btn.dataset.mood === mood);
      });
    }

    function renderProductList(container, products) {
      container.innerHTML = '';

      if (!products.length) {
        container.innerHTML = '<p class="text-small">ไม่พบสินค้าในหมวดนี้</p>';
        return;
      }

      products.forEach(function (product) {
        container.appendChild(buildProductCard(product));
      });
    }

    function buildProductCard(product) {
      var card = document.createElement('article');
      card.className = 'card product-card';

      var orderUrl = 'order.html'
        + '?item=' + encodeURIComponent(product.name)
        + '&price=' + encodeURIComponent(product.price);

      card.innerHTML =
        '<img class="card__image" src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
        '<div class="card__body">' +
          '<div class="card__meta">' +
            '<span class="mood-dot mood-dot--' + escapeHtml(product.mood) + '"></span>' +
            '<span class="mood-label">' + escapeHtml(MOOD_LABELS[product.mood] || product.mood) + '</span>' +
          '</div>' +
          '<h3 class="card__title">' + escapeHtml(product.name) + '</h3>' +
          '<p class="text-small">' + escapeHtml(product.size) + '</p>' +
          '<div class="card__price">฿' + formatPrice(product.price) + '</div>' +
          '<a class="btn btn-outline" style="margin-top:0.75rem;width:100%;" href="' + orderUrl + '">สั่งซื้อ</a>' +
        '</div>';

      return card;
    }
  }

  /* ===========================================================
     3. order.html — เติมฟอร์มจาก URL param, ส่ง order ไป Apps Script
     =========================================================== */
  function initOrderPage() {
    var form = qs('#orderForm');
    if (!form) return; // ไม่ใช่หน้านี้ ข้ามไป

    var itemsField = qs('#items', form) || document.getElementById('items');
    var totalField = qs('#total', form) || document.getElementById('total');
    var customerNameField = document.getElementById('customerName');
    var contactField = document.getElementById('contact');
    var noteField = document.getElementById('note');

    // เติมค่าจาก URL parameter ทันทีที่โหลดหน้า
    var itemParam = getParam('item');
    var priceParam = getParam('price');

    if (itemsField && itemParam) {
      itemsField.value = itemParam;
    }
    if (totalField && priceParam) {
      totalField.value = priceParam;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = {
        customerName: customerNameField ? customerNameField.value : '',
        contact: contactField ? contactField.value : '',
        items: itemsField ? itemsField.value : '',
        total: totalField ? totalField.value : '',
        note: noteField ? noteField.value : ''
      };

      var submitBtn = form.querySelector('[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
        .then(function () {
          window.location.href = 'thankyou.html';
        })
        .catch(function (error) {
          console.error(error);
          alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
          if (submitBtn) submitBtn.disabled = false;
        });
    });
  }

  /* ===========================================================
     4. admin.html — โหลด CSV, parse เอง, แสดงตารางเรียงล่าสุดก่อน
     =========================================================== */
  function initAdminPage() {
    var tbody = qs('#ordersTable tbody');
    if (!tbody) return; // ไม่ใช่หน้านี้ ข้ามไป

    fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
        return res.text();
      })
      .then(function (csvText) {
        var rows = parseCSV(csvText);
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-small">ยังไม่มีข้อมูล</td></tr>';
          return;
        }

        // แถวแรกถือเป็น header ตัดทิ้ง
        var dataRows = rows.slice(1).filter(function (row) {
          return row.length > 1 || (row[0] && row[0].trim() !== '');
        });

        // คอลัมน์ที่คาดหวัง: [Timestamp, customerName, contact, items, total, note]
        dataRows.sort(function (a, b) {
          var dateA = new Date(a[0]);
          var dateB = new Date(b[0]);
          return dateB - dateA; // ล่าสุดขึ้นก่อน
        });

        renderTable(tbody, dataRows);
      })
      .catch(function (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="6" class="text-small">ไม่สามารถโหลดข้อมูลได้ในขณะนี้</td></tr>';
      });

    function renderTable(container, rows) {
      container.innerHTML = '';
      rows.forEach(function (row) {
        var tr = document.createElement('tr');
        // วันเวลา, ชื่อลูกค้า, เบอร์โทร/Line, รายการสินค้า, จำนวนเงินรวม, หมายเหตุ
        for (var i = 0; i < 6; i++) {
          var td = document.createElement('td');
          td.textContent = row[i] !== undefined ? row[i] : '';
          tr.appendChild(td);
        }
        container.appendChild(tr);
      });
    }

    // Parser CSV แบบง่าย รองรับ field ที่ครอบด้วย "..." และ comma/newline ภายใน field
    function parseCSV(text) {
      var rows = [];
      var row = [];
      var field = '';
      var inQuotes = false;

      // Normalize line endings
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      for (var i = 0; i < text.length; i++) {
        var char = text[i];

        if (inQuotes) {
          if (char === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i++; // skip escaped quote
            } else {
              inQuotes = false;
            }
          } else {
            field += char;
          }
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            row.push(field);
            field = '';
          } else if (char === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
          } else {
            field += char;
          }
        }
      }

      // field/row สุดท้ายที่เหลือ (กรณีไฟล์ไม่ลงท้ายด้วย newline)
      if (field !== '' || row.length) {
        row.push(field);
        rows.push(row);
      }

      // ตัดแถวว่างล้วนทิ้ง
      return rows.filter(function (r) {
        return r.some(function (cell) {
          return cell !== '';
        });
      });
    }
  }

  /* ---------------------------------------------------------
     5. Helper: escape ข้อความก่อนแทรกเป็น HTML
     --------------------------------------------------------- */
  function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------
     6. Init เมื่อ DOM พร้อม — แต่ละฟังก์ชันจะเช็ก element เอง
        แล้วข้ามถ้าไม่ใช่หน้าที่เกี่ยวข้อง
     --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initProductPage();
    initOrderPage();
    initAdminPage();
  });
})();
