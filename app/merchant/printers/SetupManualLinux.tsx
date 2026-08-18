// On-page Linux setup manual shown on the merchant "My printers" page.
// Linux edition of SetupManual.tsx: same n8n + ngrok + Telegram stack, but
// printing goes through CUPS `lp` (no SumatraPDF) and the launcher is
// start-print-station.sh. Mirrors agent/MERCHANT-SETUP-LINUX.md in Mongolian.

import { Cmd, Step } from "./SetupManual";

const printNodeCode = `const { execSync } = require('child_process');

// ==== ЭНЭ ХОЁР МӨРИЙГ ЗАСНА ================================
const printer = 'HP_LaserJet_1020';        // lpstat -p нэр
const dir = '/home/НЭР/uulen-print';       // Save to disk-тэй адил зам
// ===========================================================

const body = $node["Webhook"].json.body;

const copies = body.copies || 1;
const color = body.color ? '' : ' -o print-color-mode=monochrome';
const duplex = body.duplex ? ' -o sides=two-sided-long-edge' : ' -o sides=one-sided';
const file = \`\${dir}/\${body.filename}\`;

const cmd = \`lp -d "\${printer}" -n \${copies}\${color}\${duplex} "\${file}"\`;
execSync(cmd);

return { jobId: body.jobId, chatId: body.chatId, printed: true };`;

export default function SetupManualLinux() {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Linux компьютерт суулгах заавар (Print Station)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Дээрх Windows заавартай яг ижил систем — зөвхөн Linux (Ubuntu/Debian
        г.м) компьютерт зориулсан хувилбар. Ялгаа нь: SumatraPDF хэрэггүй
        (Linux нь CUPS-ийн <code>lp</code> командаар хэвлэнэ), ажлын фолдер нь{" "}
        <code>~/uulen-print</code>, асаагч нь{" "}
        <code>start-print-station.sh</code>. Ойролцоогоор{" "}
        <strong>45–60 минут</strong> зарцуулна.
      </p>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Урьдчилан бэлдэх:</strong> ажлын цагаар асаалттай байдаг Linux
        компьютер (Ubuntu 22.04+ / Debian 12+ санал болгоно), CUPS-д суулгасан
        принтер, интернэт, Telegram данс, болон{" "}
        <code>n8n-webapp-print.json</code>, <code>start-print-station.sh</code>{" "}
        файлууд (Үүлэн Хэвлэл админаас авна).
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Дэлгэрэнгүй гарын авлага (англи): төслийн{" "}
        <code>agent/MERCHANT-SETUP-LINUX.md</code>. Хэрхэн ажилладаг, Telegram
        бот, туршилтын алхмууд Windows-тэй адил — доор зөвхөн Linux-ын
        ялгаатай хэсгүүдийг дэлгэрэнгүй тайлбарлав.
      </div>

      <div className="mt-4 space-y-2">
        <Step n="1" title="Node.js суулгах (v20+)">
          <p>
            n8n нь Node.js дээр ажиллана. <strong>v20 буюу түүнээс дээш</strong>{" "}
            байх ёстой — олон дистрибуцын үндсэн <code>apt</code> хувилбар (v18)
            ажиллахгүй. Ubuntu/Debian дээр NodeSource-оос:
          </p>
          <Cmd>{`curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs`}</Cmd>
          <p>
            (Эсвэл <code>nvm</code> ашиглаж болно: <code>nvm install 22</code>.)
            Шинэ терминал нээж шалга:
          </p>
          <Cmd>node --version</Cmd>
          <p>
            <code>v20.x</code> буюу дээш гарвал OK.
          </p>
        </Step>

        <Step n="2" title="CUPS шалгах (хэвлэх систем — SumatraPDF хэрэггүй)">
          <p>
            Linux нь CUPS-аар хэвлэдэг тул нэмэлт програм хэрэггүй. Ихэнх
            desktop дистрибуцад аль хэдийн суусан байдаг — баталгаажуулъя:
          </p>
          <Cmd>{`sudo apt-get install -y cups cups-client
sudo usermod -aG lpadmin $USER   # принтер удирдах эрх; дараа нь гарч орно`}</Cmd>
          <p>
            Принтерээ системийн Settings → Printers, эсвэл CUPS вэб UI{" "}
            (<code>http://localhost:631</code>) дээр нэмж/шалгана.
          </p>
        </Step>

        <Step n="3" title="Принтерийн CUPS нэрийг олох">
          <Cmd>lpstat -p -d</Cmd>
          <p>
            Гарч ирсэн <strong>яг нэрийг</strong> тэмдэглэ — CUPS нэрэнд зай
            байдаггүй (ж: <code>HP_LaserJet_1020</code>). Туршиж хэвлэ:
          </p>
          <Cmd>{`echo "test" | lp -d HP_LaserJet_1020`}</Cmd>
        </Step>

        <Step n="4" title="Ажлын фолдер үүсгэх">
          <p>Ирсэн файлууд хэвлэхээс өмнө энд хадгалагдана:</p>
          <Cmd>mkdir -p ~/uulen-print</Cmd>
        </Step>

        <Step n="5" title="ngrok тохируулах (интернэт суваг)">
          <p>
            Windows-тэй адил: үнэгүй данс нээж, Linux хувилбарыг{" "}
            <a
              className="text-brand-600 underline"
              href="https://ngrok.com/download"
              target="_blank"
              rel="noreferrer"
            >
              ngrok.com/download
            </a>
            -оос суулга (Ubuntu/Debian дээр apt репозиторын сонголт хамгийн
            хялбар). Дараа нь:
          </p>
          <Cmd>ngrok config add-authtoken &lt;ТАНЫ_ТОКЕН&gt;</Cmd>
          <p>
            Dashboard → <strong>Domains</strong>-оос үнэгүй{" "}
            <strong>static domain</strong> ав (ж:{" "}
            <code>жишээ.ngrok-free.dev</code>) — тэмдэглэ.
          </p>
          <p className="text-amber-700">
            ⚠️ Нэг ngrok дансанд нэг л домэйн. Компьютер бүрд өөрийн ngrok данс.
          </p>
        </Step>

        <Step n="6" title="n8n-ийг анх удаа асаах (start-print-station.sh)">
          <p>
            <code>start-print-station.sh</code>-ийг гэрийн фолдертоо хуулж,
            текст засварлагчаар нээгээд{" "}
            <code>NGROK_DOMAIN=&quot;...&quot;</code> мөрийг өөрийн домэйнээр
            солино. Дараа нь:
          </p>
          <Cmd>{`chmod +x ~/start-print-station.sh
~/start-print-station.sh`}</Cmd>
          <p>
            Windows-оос ялгаатай нь <strong>нэг л терминал</strong>: ngrok ард
            нь ажиллана (лог нь <code>~/uulen-print/ngrok.log</code>), n8n
            урдаа. Эхний удаа багц татна, хэдэн минут хүлээгээд{" "}
            <code>Editor is now accessible</code> гарахыг хүлээ. Дараа нь{" "}
            <code>http://localhost:5678</code> нээж <strong>owner аккаунт</strong>{" "}
            үүсгэ. Терминалыг нээлттэй үлдээ.
          </p>
        </Step>

        <Step n="7" title="Telegram бот үүсгэх (Windows-тэй адил)">
          <p>
            Windows зааврын Алхам 7-той яг адил: <strong>@BotFather</strong> →{" "}
            <code>/newbot</code> → токен ав → ботдоо мессеж илгээ →{" "}
            <code>https://api.telegram.org/bot&lt;ТОКЕН&gt;/getUpdates</code>
            -оос <strong>chat id</strong>-гаа ав.
          </p>
        </Step>

        <Step n="8" title="Workflow-ийг n8n-д импортлох (Linux засвартай)">
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              n8n → <strong>Credentials</strong> → <strong>Telegram API</strong>{" "}
              → ботын токеноо оруулж хадгал.
            </li>
            <li>
              <strong>Import from File</strong> →{" "}
              <code>n8n-webapp-print.json</code> сонго. “Webhook → Download →
              Save → Print → Ack” гэсэн 5 node нээгдэнэ.
            </li>
            <li>
              <strong>Save to disk</strong> node → <strong>File Path and
              Name</strong>-ийг Windows замаас Linux зам болгож солино
              (<code>НЭР</code>-ийг <code>whoami</code>-оор гарах хэрэглэгчийн
              нэрээр):
              <Cmd>{`/home/НЭР/uulen-print/{{ $node["Webhook"].json.body.filename }}`}</Cmd>
            </li>
            <li>
              <strong>Print</strong> node → кодыг бүхэлд нь доорх Linux
              хувилбараар солиод, тэмдэглэсэн 2 мөрийг (принтерийн нэр, фолдер)
              засна:
              <Cmd>{printNodeCode}</Cmd>
            </li>
            <li>
              <strong>Ack in chat</strong> node → Telegram credential-аа сонго.
            </li>
            <li>
              <strong>Save</strong> → <strong>Publish</strong>. <strong>Webhook</strong>{" "}
              node дээрх <strong>Production URL</strong>-ыг хуулж ав:
              <Cmd>https://жишээ.ngrok-free.dev/webhook/uulen-print</Cmd>
            </li>
          </ol>
        </Step>

        <Step n="9" title="Принтерээ uulen.xyz дээр холбох + туршилт">
          <p>
            Windows зааврын Алхам 9–10-тай яг адил: энэ хуудсан дээрх принтерийн{" "}
            <strong>Засах</strong> → <strong>Bot token</strong>,{" "}
            <strong>Chat ID</strong>, <strong>n8n Webhook URL</strong>-ыг бөглөж{" "}
            <strong>Хадгалах</strong>. Дараа нь хэрэглэгчээр жижиг PDF хэвлэж
            турш — ~10 секундэд принтер хэвлээд бот{" "}
            <code>✅ printed …</code> гэж хариулбал станц бэлэн! 🎉
          </p>
        </Step>
      </div>

      {/* Daily operation */}
      <details className="group mt-3 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-4 font-medium text-slate-800">
          🕘 Өдөр тутмын хэрэглээ
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
          <p>
            <strong>Асаах (өглөө бүр / reboot дараа):</strong> терминал нээгээд{" "}
            <code>~/start-print-station.sh</code> ажиллуул.{" "}
            <code>Editor is now accessible</code> гэвэл бэлэн. Терминалыг
            нээлттэй үлдээ.
          </p>
          <p>
            <strong>Унтраах:</strong> принтер сул үед терминалд{" "}
            <code>Ctrl+C</code> дар — скрипт n8n ба ngrok-ийг хамт зогсооно.
            Тохиргоо диск дээр хадгалагдана, алдагдахгүй.
          </p>
          <p>
            <strong>Станц унтарсан үед:</strong> энэ принтерийг сонгосон
            хэрэглэгч <strong>автомат буцаан төлөлт</strong> авна. Урт хаалттай
            үед админаар принтерээ идэвхгүй болгуул.
          </p>
          <p>
            <strong>Нэвтрэхэд автоматаар:</strong> Startup Applications-д{" "}
            <code>start-print-station.sh</code>-ийг нэм, эсвэл systemd user
            service болго (дэлгэрэнгүй:{" "}
            <code>agent/MERCHANT-SETUP-LINUX.md</code>).
          </p>
        </div>
      </details>

      {/* Troubleshooting */}
      <details className="group mt-2 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-4 font-medium text-slate-800">
          🛠 Түгээмэл асуудал (Linux)
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <code>node: command not found</code> — Node суулгаагүй, эсвэл nvm
              ачаалаагүй терминал. Шинэ терминал нээ.
            </li>
            <li>
              n8n <code>File is not defined</code> — Node v18 байна. v20+
              суулгаад кэш устга: <code>rm -rf ~/.npm/_npx</code>.
            </li>
            <li>
              <code>ERR_NGROK_3200 / offline</code> — скрипт зогссон, эсвэл
              ngrok унасан (<code>~/uulen-print/ngrok.log</code> хар).{" "}
              <code>start-print-station.sh</code> дахин ажиллуул.
            </li>
            <li>
              <code>lp: Error - The printer or class does not exist</code> —
              принтерийн нэр буруу. <code>lpstat -p</code>-ийн яг нэрийг хэрэглэ
              (доогуур зураастай, зайгүй).
            </li>
            <li>
              Файл хадгалагдсан ч хэвлэхгүй — гараар турш:{" "}
              <code>lp -d &quot;НЭР&quot; ~/uulen-print/файл.pdf</code>; дараалал:{" "}
              <code>lpstat -o</code> (цэвэрлэх: <code>cancel -a</code>); CUPS:{" "}
              <code>systemctl status cups</code>.
            </li>
            <li>
              Өнгө/хоёр тал солигдохгүй — драйверын дэмждэг сонголтыг{" "}
              <code>lpoptions -p НЭР -l</code>-ээр хараад Print node-ын командыг
              тохируул.
            </li>
            <li>
              Вэб апп <code>n8n webhook 404</code> — workflow{" "}
              <strong>Publish</strong> хийгээгүй, эсвэл буруу URL. Production
              URL-ыг дахин хуул.
            </li>
            <li>
              Бот юу ч авахгүй — токен/chat id буруу (Алхам 7 дахин).
            </li>
          </ul>
        </div>
      </details>
    </section>
  );
}
