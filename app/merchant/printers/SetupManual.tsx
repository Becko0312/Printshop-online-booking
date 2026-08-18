// On-page Windows setup manual shown on the merchant "My printers" page.
// Turns a shop Windows PC into an automatic print station (n8n + ngrok +
// Telegram bot). This mirrors agent/MERCHANT-SETUP.md in Mongolian, in
// collapsible <details> sections (native — no client JS needed).

export function Cmd({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-x-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
      <code>{children}</code>
    </pre>
  );
}

export function Step({
  n,
  title,
  children,
  defaultOpen = false,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-slate-200 bg-white [&_summary]:cursor-pointer"
    >
      <summary className="flex items-center gap-3 p-4 font-medium text-slate-800 list-none">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm text-white">
          {n}
        </span>
        <span className="flex-1">{title}</span>
        <span className="text-slate-400 group-open:rotate-180 transition">▾</span>
      </summary>
      <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
        {children}
      </div>
    </details>
  );
}

export default function SetupManual() {
  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-slate-900">
        Windows компьютерт суулгах заавар (Print Station)
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Дэлгүүрийн Windows компьютерээ автомат хэвлэлийн станц болгоно.
        Тохируулсны дараа хэрэглэгч төлбөрөө төлж файлаа илгээмэгц принтер
        хэдхэн секундэд өөрөө хэвлэнэ — хүн оролцох шаардлагагүй. Ойролцоогоор{" "}
        <strong>45–60 минут</strong> зарцуулна.
      </p>

      <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        <strong>Урьдчилан бэлдэх:</strong> ажлын цагаар асаалттай байдаг Windows
        10/11 компьютер, суулгасан принтер, интернэт, Telegram данс, болон{" "}
        <code>n8n-webapp-print.json</code>, <code>start-print-station.bat</code>{" "}
        файлууд (Үүлэн Хэвлэл админаас авна).
      </div>

      <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        Дэлгэрэнгүй, зурагтай гарын авлага (англи): төслийн{" "}
        <code>agent/MERCHANT-SETUP.md</code>. Асуудал гарвал доорх
        “Түгээмэл асуудал” хэсэг эсвэл админд хандана уу.
      </div>

      {/* How it works */}
      <div className="mt-4 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
        <div className="font-medium text-slate-700 mb-1">Хэрхэн ажилладаг вэ</div>
        Хэрэглэгч (uulen.xyz) төлбөр төлж файлаа илгээнэ → вэб апп таны n8n-ийн
        Webhook руу дохио өгнө (ngrok сувгаар) → n8n файлыг татаад SumatraPDF-ээр
        принтерт хэвлүүлнэ → бот чатад “✅ printed …” гэж бичнэ. Мерчант бүр
        <strong> өөрийн</strong> бот, ngrok, n8n-тэй — хуваалцдаггүй.
      </div>

      <div className="mt-4 space-y-2">
        <Step n="1" title="Node.js суулгах (v20+)" defaultOpen>
          <p>
            n8n нь Node.js дээр ажиллана. <strong>v20 буюу түүнээс дээш</strong>{" "}
            байх ёстой (v18 ажиллахгүй).
          </p>
          <p>
            <a
              className="text-brand-600 underline"
              href="https://nodejs.org/en/download"
              target="_blank"
              rel="noreferrer"
            >
              nodejs.org
            </a>
            -оос <strong>Windows Installer (.msi), 64-bit, LTS</strong> татаж
            суулга. Дараа нь <strong>шинэ</strong> PowerShell цонх нээж шалга:
          </p>
          <Cmd>node --version</Cmd>
          <p>
            <code>v20.x</code> буюу дээш гарвал OK. Хэрэв дараа нь “running
            scripts is disabled” гэвэл нэг удаа:
          </p>
          <Cmd>Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned</Cmd>
        </Step>

        <Step n="2" title="SumatraPDF суулгах (хэвлэх туслах)">
          <p>
            SumatraPDF нь PDF-ийг командын мөрөөс хэвлэдэг жижиг үнэгүй програм.{" "}
            <a
              className="text-brand-600 underline"
              href="https://www.sumatrapdfreader.org/download-free-pdf-viewer"
              target="_blank"
              rel="noreferrer"
            >
              Эндээс
            </a>{" "}
            (64-bit) татаж суулга. Дараа нь замыг нь олж <strong>тэмдэглэ</strong>{" "}
            (Алхам 8-д хэрэгтэй):
          </p>
          <Cmd>{`Get-ChildItem -Path "C:\\Program Files","C:\\Users\\$env:USERNAME\\AppData\\Local" -Filter SumatraPDF.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName`}</Cmd>
          <p>
            Ихэвчлэн{" "}
            <code>C:\Users\&lt;нэр&gt;\AppData\Local\SumatraPDF\SumatraPDF.exe</code>.
          </p>
        </Step>

        <Step n="3" title="Принтерийн Windows нэрийг олох">
          <Cmd>Get-Printer | Select-Object Name</Cmd>
          <p>
            Гарч ирсэн <strong>яг нэрийг</strong> тэмдэглэ (том/жижиг үсэг, зай
            хамаатай, ж: <code>HP LaserJet 1020</code>). Туршиж хэвлэ:
          </p>
          <Cmd>{`"test" | Out-Printer -Name "HP LaserJet 1020"`}</Cmd>
        </Step>

        <Step n="4" title="Ажлын фолдер үүсгэх">
          <p>Ирсэн файлууд хэвлэхээс өмнө энд хадгалагдана:</p>
          <Cmd>{`New-Item -ItemType Directory -Force -Path "C:\\uulen-print"`}</Cmd>
        </Step>

        <Step n="5" title="ngrok тохируулах (интернэт суваг)">
          <p>
            ngrok нь компьютерт байнгын нийтийн хаяг өгнө (үүлэн апп n8n-руу
            хүрэхэд хэрэгтэй). <strong>Үнэгүй багц хангалттай</strong> — нэг
            байнгын домэйнтэй.
          </p>
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              <a
                className="text-brand-600 underline"
                href="https://dashboard.ngrok.com/signup"
                target="_blank"
                rel="noreferrer"
              >
                Үнэгүй данс
              </a>{" "}
              нээ, ngrok-ийг татаж суулга.
            </li>
            <li>
              Authtoken-оо нэмэ:
              <Cmd>ngrok config add-authtoken &lt;ТАНЫ_ТОКЕН&gt;</Cmd>
            </li>
            <li>
              Dashboard → <strong>Domains</strong>-оос үнэгүй{" "}
              <strong>static domain</strong> ав (ж:{" "}
              <code>жишээ.ngrok-free.dev</code>) — тэмдэглэ.
            </li>
          </ol>
          <p className="text-amber-700">
            ⚠️ Нэг ngrok дансанд нэг л домэйн. Компьютер бүрд өөрийн ngrok данс.
          </p>
        </Step>

        <Step n="6" title="n8n-ийг анх удаа асаах">
          <p>
            <code>start-print-station.bat</code>-ыг Notepad-аар нээж{" "}
            <code>set NGROK_DOMAIN=...</code> мөрийг өөрийн домэйнээр солино.
            Хадгалаад <strong>давхар товшиж</strong> ажиллуул — ngrok ба n8n гэсэн
            2 цонх нээгдэнэ. Эхний удаа багц татна, хэдэн минут хүлээ.
          </p>
          <p>
            Дараа нь <code>http://localhost:5678</code> нээж{" "}
            <strong>owner аккаунт</strong> (и-мэйл + нууц үг) үүсгэ. Хоёр цонхыг
            нээлттэй үлдээ.
          </p>
        </Step>

        <Step n="7" title="Telegram бот үүсгэх">
          <ol className="ml-4 list-decimal space-y-1">
            <li>
              Telegram дээр <strong>@BotFather</strong> → <code>/newbot</code> →
              нэр өг (username <code>bot</code>-оор төгсөнө). <strong>Токен</strong>{" "}
              (<code>123456789:AAE…</code>) хуулж ав — нууц үг шиг хадгал.
            </li>
            <li>Шинэ бот руугаа орж ямар нэг мессеж (ж: <code>hi</code>) илгээ.</li>
            <li>
              <strong>chat id</strong> ав — хөтчөөр нээ:
              <Cmd>https://api.telegram.org/bot&lt;ТОКЕН&gt;/getUpdates</Cmd>
              JSON доторх <code>&quot;chat&quot;:&#123;&quot;id&quot;: &lt;тоо&gt;</code>{" "}
              — тэр тоо чиний chat id.
            </li>
          </ol>
        </Step>

        <Step n="8" title="Workflow-ийг n8n-д импортлох">
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
              <strong>Ack in chat</strong> node → дээрх Telegram credential-аа
              сонго.
            </li>
            <li>
              <strong>Print</strong> node → кодын дээд хэсэгт{" "}
              <code>sumatra</code> (Алхам 2-ын зам, давхар <code>\\</code>-тай) ба{" "}
              <code>printer</code> (Алхам 3-ын нэр)-г засна.
            </li>
            <li>
              <strong>Save</strong> → <strong>Publish</strong>. <strong>Webhook</strong>{" "}
              node дээрх <strong>Production URL</strong>-ыг хуулж ав:
              <Cmd>https://жишээ.ngrok-free.dev/webhook/uulen-print</Cmd>
            </li>
          </ol>
        </Step>

        <Step n="9" title="Принтерээ uulen.xyz дээр холбох">
          <p>
            Энэ хуудсан дээрх принтерийн <strong>Засах</strong> дарж{" "}
            <strong>Telegram / n8n тохиргоо</strong> хэсгийг бөглө:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Bot token</strong> — Алхам 7-ын токен
            </li>
            <li>
              <strong>Chat ID</strong> — Алхам 7-ын chat id
            </li>
            <li>
              <strong>n8n Webhook URL</strong> — Алхам 8-ын Production URL
            </li>
          </ul>
          <p>
            <strong>Хадгалах</strong> → карт дээр{" "}
            <span className="chip bg-emerald-50 text-emerald-700">
              Telegram холбогдсон
            </span>{" "}
            (ногоон) гарна.
          </p>
        </Step>

        <Step n="10" title="Туршилт">
          <p>
            Хэрэглэгчээр нэвтэр (хэтэвчиндээ мөнгөтэй) → <strong>Хэвлэх</strong> →
            жижиг PDF → энэ принтер → <strong>Хэвлэлт илгээх</strong> →{" "}
            <strong>Telegram / n8n</strong>. ~10 секундэд: бот чатад файл ирнэ,
            принтер хэвлэнэ, бот <code>✅ printed …</code> гэж хариулна. n8n →{" "}
            <strong>Executions</strong>-д ногоон гүйлт харагдвал станц бэлэн! 🎉
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
            <strong>Асаах (өглөө бүр / reboot дараа):</strong>{" "}
            <code>start-print-station.bat</code>-ыг давхар товш. ngrok{" "}
            <code>online</code>, n8n <code>Editor is now accessible</code> гэвэл
            бэлэн. Хоёр цонхыг нээлттэй үлдээ.
          </p>
          <p>
            <strong>Унтраах:</strong> принтер сул үед n8n ба ngrok цонхыг хаа
            (Ctrl+C) → Windows-оо унтраа. Тохиргоо диск дээр хадгалагдана,
            алдагдахгүй.
          </p>
          <p>
            <strong>Станц унтарсан үед:</strong> энэ принтерийг сонгосон хэрэглэгч{" "}
            <strong>автомат буцаан төлөлт</strong> авна (апп webhook хүрэхгүйг
            мэдэрч мөнгийг шууд буцаана). Урт хаалттай үед админаар принтерээ
            идэвхгүй болгуул.
          </p>
          <p>
            <strong>PC асахад автоматаар:</strong> <code>Win+R</code> →{" "}
            <code>shell:startup</code> → нээгдсэн фолдерт{" "}
            <code>start-print-station.bat</code>-ын shortcut хий.
          </p>
        </div>
      </details>

      {/* Troubleshooting */}
      <details className="group mt-2 rounded-lg border border-slate-200 bg-white">
        <summary className="cursor-pointer list-none p-4 font-medium text-slate-800">
          🛠 Түгээмэл асуудал
        </summary>
        <div className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 space-y-2">
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <code>node not recognized</code> — Node суулгаагүй, эсвэл хуучин
              PowerShell цонх. Шинэ цонх нээ.
            </li>
            <li>
              n8n <code>File is not defined</code> — Node v18 байна. v20+ суулгаад{" "}
              <code>_npx</code> кэшийг устга.
            </li>
            <li>
              <code>ERR_NGROK_3200 / offline</code> — ngrok цонх хаагдсан.{" "}
              <code>start-print-station.bat</code> дахин ажиллуул.
            </li>
            <li>
              Вэб апп <code>n8n webhook 404</code> — workflow{" "}
              <strong>Publish</strong> хийгээгүй, эсвэл буруу URL. Production
              URL-ыг дахин хуул.
            </li>
            <li>
              Файл хадгалагдсан ч хэвлэхгүй — SumatraPDF зам/принтерийн нэрийг
              шалга:{" "}
              <code>Get-PrintJob -PrinterName &quot;...&quot;</code>.
            </li>
            <li>
              Бот юу ч авахгүй — токен/chat id буруу (Алхам 7 дахин).
            </li>
          </ul>
          <p className="text-xs text-slate-500">
            Бот өөрөө хэвлэлтийг эхлүүлж чадахгүй — Telegram ботын өөрийн
            мессежийг буцааж өгдөггүй тул апп n8n webhook руу шууд дохио өгдөг.
            Чат нь бүртгэл, webhook нь жинхэнэ дохио.
          </p>
        </div>
      </details>
    </section>
  );
}
